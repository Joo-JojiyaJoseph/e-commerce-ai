<?php

namespace Webfolks\CommerceCore\Actions;

use Illuminate\Support\Facades\DB;
use Webfolks\CommerceCore\Contracts\InventoryAllocator;
use Webfolks\CommerceCore\Contracts\PaymentGateway;
use Webfolks\CommerceCore\Enums\OrderStatus;
use Webfolks\CommerceCore\Enums\PaymentStatus;
use Webfolks\CommerceCore\Exceptions\InvalidOrderStateException;
use Webfolks\CommerceCore\Models\Order;

class CancelOrderAction
{
    public function __construct(
        protected PaymentGateway $payments,
        protected InventoryAllocator $inventory,
    ) {}

    public function execute(Order $order): Order
    {
        if (in_array($order->status, [
            OrderStatus::Cancelled,
            OrderStatus::Fulfilled,
            OrderStatus::Shipped,
            OrderStatus::OutForDelivery,
            OrderStatus::Delivered,
            OrderStatus::Returned,
        ], true)) {
            throw InvalidOrderStateException::cannotCancel($order->status->value);
        }

        return DB::transaction(function () use ($order): Order {
            $order->loadMissing('items.variant');

            foreach ($order->items as $item) {
                if ($item->variant) {
                    $this->inventory->release($item->variant, (int) $item->quantity);
                }
            }

            if ($order->payment_status === PaymentStatus::Completed) {
                $this->payments->refund($order);
                $order->markAsRefunded();
            }

            $order->markAsCancelled();

            return $order->refresh()->load('items');
        });
    }
}
