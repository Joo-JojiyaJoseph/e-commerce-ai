<?php

use App\Models\Product;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Webfolks\CommerceCore\Actions\AddToCartAction;
use Webfolks\CommerceCore\Actions\PlaceOrderAction;
use Webfolks\CommerceCore\Models\Cart;
use Webfolks\CommerceCore\Models\ProductVariant;

test('lists product reviews', function () {
    $product = Product::factory()->create(['slug' => 'linen-overshirt']);
    ProductVariant::factory()->recycle($product)->create();

    $this->getJson('/api/commerce/products/linen-overshirt/reviews')
        ->assertOk()
        ->assertJsonPath('data', []);
});

test('creates a review for an authenticated customer', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create(['slug' => 'canvas-tote']);
    ProductVariant::factory()->recycle($product)->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/commerce/products/canvas-tote/reviews', [
        'rating' => 5,
        'title' => 'Excellent tote',
        'body' => 'Holds a laptop and a water bottle without sagging.',
    ])
        ->assertCreated()
        ->assertJsonPath('data.rating', 5)
        ->assertJsonPath('data.is_verified', false)
        ->assertJsonPath('data.status', 'pending');

    $this->getJson('/api/commerce/products/canvas-tote/reviews')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

test('marks a review as verified after a paid purchase', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create(['slug' => 'merino-beanie']);
    $variant = ProductVariant::factory()->recycle($product)->create(['price' => '18.00', 'stock' => 4]);
    $cart = Cart::factory()->create(['user_id' => $user->id]);
    app(AddToCartAction::class)->execute($cart, $variant);
    app(PlaceOrderAction::class)->execute($cart, [
        'name' => 'Casey Buyer',
        'line1' => '88 Harbor Ave',
        'city' => 'Seattle',
        'postal_code' => '98101',
        'country' => 'US',
    ]);

    Sanctum::actingAs($user);

    $this->postJson('/api/commerce/products/merino-beanie/reviews', [
        'rating' => 4,
        'title' => 'Warm',
        'body' => 'Keeps me warm on morning walks without itching.',
    ])
        ->assertCreated()
        ->assertJsonPath('data.is_verified', true);
});
