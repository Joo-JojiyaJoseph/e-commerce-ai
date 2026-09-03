<?php

use Webfolks\CommerceCore\Actions\AddToCartAction;
use Webfolks\CommerceCore\Actions\PlaceOrderAction;
use Webfolks\CommerceCore\Models\Cart;
use Webfolks\CommerceCore\Models\Product;
use Webfolks\CommerceCore\Models\ProductVariant;

test('shows a placed order by number', function () {
    $variant = ProductVariant::factory()->for(Product::factory())->create(['price' => '18.00', 'stock' => 4]);
    $cart = Cart::factory()->create();
    app(AddToCartAction::class)->execute($cart, $variant);

    $order = app(PlaceOrderAction::class)->execute($cart, [
        'name' => 'Casey Buyer',
        'line1' => '88 Harbor Ave',
        'city' => 'Seattle',
        'postal_code' => '98101',
        'country' => 'US',
    ]);

    $this->getJson("/api/commerce/orders/{$order->number}")
        ->assertOk()
        ->assertJsonPath('data.number', $order->number)
        ->assertJsonPath('data.payment_status', 'completed');
});
