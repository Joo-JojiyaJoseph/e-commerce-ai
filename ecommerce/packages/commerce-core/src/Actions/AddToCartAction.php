<?php

namespace Webfolks\CommerceCore\Actions;

use Webfolks\CommerceCore\Contracts\InventoryAllocator;
use Webfolks\CommerceCore\Contracts\PricingEngine;
use Webfolks\CommerceCore\Exceptions\InsufficientInventoryException;
use Webfolks\CommerceCore\Models\Cart;
use Webfolks\CommerceCore\Models\CartItem;
use Webfolks\CommerceCore\Models\ProductVariant;
use Webfolks\CommerceCore\Support\Money;

class AddToCartAction
{
    public function __construct(
        protected PricingEngine $pricing,
        protected InventoryAllocator $inventory,
    ) {}

    public function execute(Cart $cart, ProductVariant $variant, int $quantity = 1): CartItem
    {
        $existing = $cart->items()->where('variant_id', $variant->id)->first();
        $nextQuantity = $quantity + (int) ($existing?->quantity ?? 0);

        if (! $this->inventory->isAvailable($variant, $nextQuantity)) {
            throw InsufficientInventoryException::for($variant, $nextQuantity);
        }

        $unitPrice = $this->pricing->priceFor($variant, 1);

        if ($existing instanceof CartItem) {
            $existing->forceFill([
                'quantity' => $nextQuantity,
                'unit_price' => $unitPrice,
                'line_total' => Money::multiply($unitPrice, $nextQuantity),
            ])->save();

            $this->pricing->applyDiscounts($cart);

            return $existing->refresh();
        }

        /** @var CartItem $item */
        $item = $cart->items()->create([
            'variant_id' => $variant->id,
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'line_total' => Money::multiply($unitPrice, $quantity),
        ]);

        $this->pricing->applyDiscounts($cart);

        return $item->refresh();
    }
}
