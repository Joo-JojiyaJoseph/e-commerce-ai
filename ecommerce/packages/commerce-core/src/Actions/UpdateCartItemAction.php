<?php

namespace Webfolks\CommerceCore\Actions;

use Webfolks\CommerceCore\Contracts\InventoryAllocator;
use Webfolks\CommerceCore\Contracts\PricingEngine;
use Webfolks\CommerceCore\Exceptions\InsufficientInventoryException;
use Webfolks\CommerceCore\Models\Cart;
use Webfolks\CommerceCore\Models\CartItem;
use Webfolks\CommerceCore\Support\Money;

class UpdateCartItemAction
{
    public function __construct(
        protected PricingEngine $pricing,
        protected InventoryAllocator $inventory,
        protected RemoveFromCartAction $removeFromCart,
    ) {}

    public function execute(Cart $cart, CartItem $item, int $quantity): ?CartItem
    {
        if ($quantity < 1) {
            $this->removeFromCart->execute($cart, $item);

            return null;
        }

        $item->loadMissing('variant');

        if ($item->variant && ! $this->inventory->isAvailable($item->variant, $quantity)) {
            throw InsufficientInventoryException::for($item->variant, $quantity);
        }

        $item->forceFill([
            'quantity' => $quantity,
            'line_total' => Money::multiply(Money::of($item->unit_price), $quantity),
        ])->save();

        $this->pricing->applyDiscounts($cart);

        return $item->refresh();
    }
}
