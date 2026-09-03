<?php

use Webfolks\CommerceCore\Models\Product;
use Webfolks\CommerceCore\Models\ProductVariant;

test('keeps the same cart when the client sends the cart token header', function () {
    $variant = ProductVariant::factory()->for(Product::factory())->create(['stock' => 6]);

    $created = $this->postJson('/api/commerce/cart/items', [
        'variant_id' => $variant->id,
        'quantity' => 1,
    ])->assertSuccessful();

    $token = $created->json('data.uuid');

    $this->flushSession();

    $this->withHeader('X-Cart-Token', $token)
        ->getJson('/api/commerce/cart')
        ->assertOk()
        ->assertJsonPath('data.uuid', $token)
        ->assertJsonPath('data.items.0.quantity', 1)
        ->assertJsonPath('data.items.0.variant.product.name', $variant->product?->name);
});
