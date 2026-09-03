<?php

namespace Webfolks\CommerceCore\Actions;

use Webfolks\CommerceCore\Enums\CartStatus;
use Webfolks\CommerceCore\Events\CartAbandoned;
use Webfolks\CommerceCore\Models\Cart;

class AbandonCartAction
{
    public function execute(Cart $cart): Cart
    {
        if ($cart->status !== CartStatus::Active) {
            return $cart;
        }

        $cart->markAsAbandoned();

        event(new CartAbandoned($cart));

        return $cart->refresh();
    }
}
