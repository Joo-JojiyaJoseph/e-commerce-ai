<?php

namespace Webfolks\CommerceCore\Actions;

use Webfolks\CommerceCore\Contracts\PricingEngine;
use Webfolks\CommerceCore\Models\Cart;
use Webfolks\CommerceCore\Models\CartItem;

class RemoveFromCartAction
{
    public function __construct(protected PricingEngine $pricing) {}

    public function execute(Cart $cart, CartItem $item): void
    {
        if ($item->cart_id !== $cart->id) {
            return;
        }

        $item->delete();

        $this->pricing->applyDiscounts($cart);
    }
}
