<?php

namespace Webfolks\CommerceCore\Pricing;

use Webfolks\CommerceCore\Contracts\PricingEngine;
use Webfolks\CommerceCore\Enums\DiscountType;
use Webfolks\CommerceCore\Models\Cart;
use Webfolks\CommerceCore\Models\Discount;
use Webfolks\CommerceCore\Models\ProductVariant;
use Webfolks\CommerceCore\Support\Money;

class DefaultPricingEngine implements PricingEngine
{
    public function priceFor(ProductVariant $variant, int $quantity = 1): string
    {
        return Money::multiply(Money::of($variant->price), $quantity);
    }

    public function applyDiscounts(Cart $cart): Cart
    {
        $cart->loadMissing(['items', 'discount']);

        $subtotal = '0.00';

        foreach ($cart->items as $item) {
            $lineTotal = Money::multiply(Money::of($item->unit_price), (int) $item->quantity);
            $item->forceFill(['line_total' => $lineTotal])->save();
            $subtotal = Money::add($subtotal, $lineTotal);
        }

        $discountTotal = $this->discountAmount($cart->discount, $subtotal);
        $shippingTotal = Money::of($cart->shipping_total ?? '0.00');
        $taxTotal = Money::of($cart->tax_total ?? '0.00');
        $total = Money::add(Money::subtract($subtotal, $discountTotal), $shippingTotal, $taxTotal);

        $cart->forceFill([
            'subtotal' => $subtotal,
            'discount_total' => $discountTotal,
            'total' => $total,
        ])->save();

        return $cart->refresh()->load(['items.variant.product', 'discount']);
    }

    protected function discountAmount(?Discount $discount, string $subtotal): string
    {
        if (! $discount instanceof Discount || ! $discount->isCurrentlyValid($subtotal)) {
            return '0.00';
        }

        return match ($discount->type) {
            DiscountType::Percentage => Money::percent($subtotal, Money::of($discount->value)),
            DiscountType::Fixed => Money::min(Money::of($discount->value), $subtotal),
        };
    }
}
