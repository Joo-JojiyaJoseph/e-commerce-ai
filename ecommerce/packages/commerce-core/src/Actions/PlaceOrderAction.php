<?php

namespace Webfolks\CommerceCore\Actions;

use Illuminate\Support\Facades\DB;
use Throwable;
use Webfolks\CommerceCore\Commerce;
use Webfolks\CommerceCore\Contracts\InventoryAllocator;
use Webfolks\CommerceCore\Contracts\PaymentGateway;
use Webfolks\CommerceCore\Contracts\PricingEngine;
use Webfolks\CommerceCore\Contracts\ShippingRateProvider;
use Webfolks\CommerceCore\Enums\PaymentStatus;
use Webfolks\CommerceCore\Events\OrderPlaced;
use Webfolks\CommerceCore\Events\PaymentCompleted;
use Webfolks\CommerceCore\Exceptions\EmptyCartException;
use Webfolks\CommerceCore\Models\Cart;
use Webfolks\CommerceCore\Models\Order;
use Webfolks\CommerceCore\Support\Money;

class PlaceOrderAction
{
    public function __construct(
        protected PaymentGateway $payments,
        protected PricingEngine $pricing,
        protected InventoryAllocator $inventory,
        protected ShippingRateProvider $shipping,
    ) {}

    /**
     * @param  array<string, mixed>  $shippingAddress
     * @param  array<string, mixed>  $paymentData
     * @param  array{item_ids?: array<int, int|string>}  $options
     */
    public function execute(Cart $cart, array $shippingAddress, array $paymentData = [], array $options = []): Order
    {
        $cart->loadMissing('items.variant.product');

        $itemIds = array_values(array_unique(array_filter(array_map('intval', $options['item_ids'] ?? []))));
        $held = [];

        if ($itemIds !== []) {
            $held = $this->parkOtherItems($cart, $itemIds);
            $cart->unsetRelation('items');
            $cart->load('items.variant.product');
        }

        try {
            return $this->place($cart, $shippingAddress, $paymentData, $held);
        } catch (Throwable $exception) {
            $this->restoreHeldItems($cart, $held);
            throw $exception;
        }
    }

    /**
     * @param  array<string, mixed>  $shippingAddress
     * @param  array<string, mixed>  $paymentData
     * @param  array<int, array{variant_id: int, quantity: int, unit_price: string, line_total: string}>  $held
     */
    protected function place(Cart $cart, array $shippingAddress, array $paymentData, array $held): Order
    {
        if ($cart->items->isEmpty()) {
            throw EmptyCartException::make();
        }

        $cart = $this->pricing->applyDiscounts($cart);
        $this->applyShipping($cart, $shippingAddress, $paymentData);

        /** @var Order $order */
        $order = DB::transaction(function () use ($cart, $shippingAddress, $paymentData, $held): Order {
            foreach ($cart->items as $item) {
                if ($item->variant) {
                    $this->inventory->reserve($item->variant, (int) $item->quantity);
                }
            }

            $cart->refresh()->load('items.variant.product');

            /** @var class-string<Order> $orderClass */
            $orderClass = Commerce::modelClass('order');
            $order = $orderClass::createFromCart($cart, $shippingAddress);
            $order->forceFill([
                'payment_gateway' => $this->payments->name(),
            ])->save();

            $result = $this->payments->charge($order, $paymentData);
            $gatewayName = $result->gateway ?? $this->payments->name();

            if ($result->successful()) {
                if ($result->captured()) {
                    $order->markAsPaid($result->reference, $gatewayName);
                } else {
                    $order->markAsConfirmed($result->reference, $gatewayName);
                }

                if ($held !== []) {
                    $purchasedIds = $cart->items->pluck('id')->all();
                    $cart->items()->whereIn('id', $purchasedIds)->delete();
                    $this->restoreHeldItems($cart, $held);

                    if ($cart->discount) {
                        $cart->discount->increment('used_count');
                        $cart->forceFill(['discount_id' => null])->save();
                        $cart->unsetRelation('discount');
                    }

                    $this->pricing->applyDiscounts($cart);
                } else {
                    $cart->markAsConverted();

                    if ($cart->discount) {
                        $cart->discount->increment('used_count');
                    }
                }
            } else {
                foreach ($cart->items as $item) {
                    if ($item->variant) {
                        $this->inventory->release($item->variant, (int) $item->quantity);
                    }
                }

                $order->markAsFailed($result->message(), $result->reference, $gatewayName);
                $this->restoreHeldItems($cart, $held);
            }

            $order = $order->refresh()->load('items');

            if ($result->clientPayload !== []) {
                $order->setAttribute('payment_client', $result->clientPayload);
            }

            return $order;
        });

        event(new OrderPlaced($order));

        if ($order->payment_status === PaymentStatus::Completed) {
            event(new PaymentCompleted($order));
        }

        return $order;
    }

    /**
     * @param  array<int, int>  $itemIds
     * @return array<int, array{variant_id: int, quantity: int, unit_price: string, line_total: string}>
     */
    protected function parkOtherItems(Cart $cart, array $itemIds): array
    {
        $held = [];

        foreach ($cart->items as $item) {
            if (in_array((int) $item->id, $itemIds, true)) {
                continue;
            }

            $held[] = [
                'variant_id' => (int) $item->variant_id,
                'quantity' => (int) $item->quantity,
                'unit_price' => (string) $item->unit_price,
                'line_total' => (string) $item->line_total,
            ];
            $item->delete();
        }

        return $held;
    }

    /**
     * @param  array<int, array{variant_id: int, quantity: int, unit_price: string, line_total: string}>  $held
     */
    protected function restoreHeldItems(Cart $cart, array $held): void
    {
        foreach ($held as $row) {
            $exists = $cart->items()->where('variant_id', $row['variant_id'])->exists();

            if ($exists) {
                continue;
            }

            $cart->items()->create($row);
        }
    }

    /**
     * @param  array<string, mixed>  $shippingAddress
     * @param  array<string, mixed>  $paymentData
     */
    protected function applyShipping(Cart $cart, array $shippingAddress, array $paymentData): void
    {
        $rates = $this->shipping->ratesFor($cart, $shippingAddress);
        $requested = $paymentData['shipping_code'] ?? $rates->first()?->code;
        $rate = $rates->firstWhere('code', $requested) ?? $rates->first();

        $cart->forceFill([
            'shipping_total' => Money::of($rate?->amount ?? '0.00'),
        ])->save();

        $this->pricing->applyDiscounts($cart);
    }
}
