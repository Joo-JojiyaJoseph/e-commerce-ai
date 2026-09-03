<?php

use App\Models\Product;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Webfolks\CommerceCore\Enums\ProductStatus;
use Webfolks\CommerceCore\Models\ProductVariant;

test('adds and removes a product from the wishlist', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create(['status' => ProductStatus::Active]);
    ProductVariant::factory()->recycle($product)->create(['price' => '40.00']);

    Sanctum::actingAs($user);

    $this->postJson('/api/commerce/wishlist', ['product_id' => $product->id])
        ->assertCreated();

    $this->getJson('/api/commerce/wishlist')
        ->assertOk()
        ->assertJsonPath('data.0.slug', $product->slug);

    $this->deleteJson("/api/commerce/wishlist/{$product->id}")
        ->assertOk();

    $this->getJson('/api/commerce/wishlist')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

test('requires authentication to save a wishlist item', function () {
    $product = Product::factory()->create();

    $this->postJson('/api/commerce/wishlist', ['product_id' => $product->id])
        ->assertUnauthorized();
});
