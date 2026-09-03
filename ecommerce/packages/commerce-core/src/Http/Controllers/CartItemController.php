<?php

namespace Webfolks\CommerceCore\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Webfolks\CommerceCore\Actions\AddToCartAction;
use Webfolks\CommerceCore\Actions\RemoveFromCartAction;
use Webfolks\CommerceCore\Actions\UpdateCartItemAction;
use Webfolks\CommerceCore\Commerce;
use Webfolks\CommerceCore\Http\Requests\StoreCartItemRequest;
use Webfolks\CommerceCore\Http\Requests\UpdateCartItemRequest;
use Webfolks\CommerceCore\Http\Resources\CartResource;
use Webfolks\CommerceCore\Models\CartItem;
use Webfolks\CommerceCore\Models\ProductVariant;
use Webfolks\CommerceCore\Support\CurrentCart;

class CartItemController
{
    public function __construct(protected CurrentCart $currentCart) {}

    public function store(StoreCartItemRequest $request, AddToCartAction $addToCart): CartResource
    {
        $cart = $this->currentCart->get();
        $variant = Commerce::query('product_variant')->findOrFail($request->integer('variant_id'));

        if ($variant instanceof ProductVariant) {
            $addToCart->execute($cart, $variant, $request->integer('quantity'));
        }

        return new CartResource($cart->refresh()->load(['items.variant.product', 'discount']));
    }

    public function update(UpdateCartItemRequest $request, CartItem $cartItem, UpdateCartItemAction $updateCartItem): CartResource
    {
        $cart = $this->currentCart->get();

        abort_unless($cartItem->cart_id === $cart->id, 404);

        $updateCartItem->execute($cart, $cartItem, $request->integer('quantity'));

        return new CartResource($cart->refresh()->load(['items.variant.product', 'discount']));
    }

    public function destroy(CartItem $cartItem, RemoveFromCartAction $removeFromCart): JsonResponse|CartResource
    {
        $cart = $this->currentCart->get();

        abort_unless($cartItem->cart_id === $cart->id, 404);

        $removeFromCart->execute($cart, $cartItem);

        return new CartResource($cart->refresh()->load(['items.variant.product', 'discount']));
    }
}
