<?php

namespace Webfolks\CommerceCore\Http\Controllers;

use Webfolks\CommerceCore\Actions\ApplyDiscountAction;
use Webfolks\CommerceCore\Actions\ClearCartDiscountAction;
use Webfolks\CommerceCore\Http\Requests\ApplyDiscountRequest;
use Webfolks\CommerceCore\Http\Resources\CartResource;
use Webfolks\CommerceCore\Support\CurrentCart;

class CartDiscountController
{
    public function __construct(protected CurrentCart $currentCart) {}

    public function store(ApplyDiscountRequest $request, ApplyDiscountAction $applyDiscount): CartResource
    {
        $cart = $applyDiscount->execute(
            $this->currentCart->get(),
            $request->string('code')->toString(),
        );

        return new CartResource($cart->load(['items.variant.product', 'discount']));
    }

    public function destroy(ClearCartDiscountAction $clearDiscount): CartResource
    {
        $cart = $clearDiscount->execute($this->currentCart->get());

        return new CartResource($cart->load(['items.variant.product', 'discount']));
    }
}
