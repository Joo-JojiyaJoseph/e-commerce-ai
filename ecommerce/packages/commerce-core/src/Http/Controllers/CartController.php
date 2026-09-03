<?php

namespace Webfolks\CommerceCore\Http\Controllers;

use Webfolks\CommerceCore\Http\Resources\CartResource;
use Webfolks\CommerceCore\Support\CurrentCart;

class CartController
{
    public function __construct(protected CurrentCart $currentCart) {}

    public function show(): CartResource
    {
        $cart = $this->currentCart->get()->load(['items.variant.product', 'discount']);

        return new CartResource($cart);
    }
}
