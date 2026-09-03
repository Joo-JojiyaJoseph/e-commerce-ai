<?php

namespace Webfolks\CommerceCore\Actions;

use Webfolks\CommerceCore\Contracts\PricingEngine;
use Webfolks\CommerceCore\Models\Cart;

class ClearCartDiscountAction
{
    public function __construct(protected PricingEngine $pricing) {}

    public function execute(Cart $cart): Cart
    {
        $cart->discount()->dissociate();
        $cart->save();

        return $this->pricing->applyDiscounts($cart);
    }
}
