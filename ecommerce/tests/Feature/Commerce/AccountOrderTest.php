<?php

use App\Models\OrderStatusHistory;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Webfolks\CommerceCore\Actions\AddToCartAction;
use Webfolks\CommerceCore\Actions\PlaceOrderAction;
use Webfolks\CommerceCore\Models\Cart;
use Webfolks\CommerceCore\Models\Product;
use Webfolks\CommerceCore\Models\ProductVariant;

test('lists and shows orders that belong to the authenticated customer', function () {
    $user = User::factory()->create();
    $variant = ProductVariant::factory()->for(Product::factory())->create(['price' => '18.00', 'stock' => 4]);
    $cart = Cart::factory()->create(['user_id' => $user->id]);
    app(AddToCartAction::class)->execute($cart, $variant);
    $order = app(PlaceOrderAction::class)->execute($cart, [
        'name' => 'Casey Buyer',
        'line1' => '88 Harbor Ave',
        'city' => 'Seattle',
        'postal_code' => '98101',
        'country' => 'US',
    ]);

    Sanctum::actingAs($user);

    $this->getJson('/api/commerce/account/orders')
        ->assertOk()
        ->assertJsonPath('data.0.number', $order->number);

    $this->getJson("/api/commerce/account/orders/{$order->number}")
        ->assertOk()
        ->assertJsonPath('data.number', $order->number)
        ->assertJsonStructure(['timeline']);

    expect(OrderStatusHistory::query()->where('order_id', $order->id)->exists())->toBeTrue();
});

test('cancels an order owned by the customer', function () {
    $user = User::factory()->create();
    $variant = ProductVariant::factory()->for(Product::factory())->create(['price' => '18.00', 'stock' => 4]);
    $cart = Cart::factory()->create(['user_id' => $user->id]);
    app(AddToCartAction::class)->execute($cart, $variant);
    $order = app(PlaceOrderAction::class)->execute($cart, [
        'name' => 'Casey Buyer',
        'line1' => '88 Harbor Ave',
        'city' => 'Seattle',
        'postal_code' => '98101',
        'country' => 'US',
    ]);

    Sanctum::actingAs($user);

    $this->postJson("/api/commerce/account/orders/{$order->number}/cancel")
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled');
});

test('does not show another customer order', function () {
    $owner = User::factory()->create();
    $stranger = User::factory()->create();
    $variant = ProductVariant::factory()->for(Product::factory())->create(['price' => '18.00', 'stock' => 4]);
    $cart = Cart::factory()->create(['user_id' => $owner->id]);
    app(AddToCartAction::class)->execute($cart, $variant);
    $order = app(PlaceOrderAction::class)->execute($cart, [
        'name' => 'Casey Buyer',
        'line1' => '88 Harbor Ave',
        'city' => 'Seattle',
        'postal_code' => '98101',
        'country' => 'US',
    ]);

    Sanctum::actingAs($stranger);

    $this->getJson("/api/commerce/account/orders/{$order->number}")
        ->assertNotFound();
});
