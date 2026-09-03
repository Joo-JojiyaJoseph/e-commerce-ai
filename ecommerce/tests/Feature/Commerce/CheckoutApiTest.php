<?php

use Webfolks\CommerceCore\Models\Product;
use Webfolks\CommerceCore\Models\ProductVariant;

test('adds an item and places an order through the commerce api', function () {
    $variant = ProductVariant::factory()
        ->for(Product::factory())
        ->create(['price' => '22.00', 'stock' => 9]);

    $this->postJson('/api/commerce/cart/items', [
        'variant_id' => $variant->id,
        'quantity' => 1,
    ])->assertSuccessful()->assertJsonPath('data.items.0.quantity', 1);

    $this->postJson('/api/commerce/checkout', [
        'shipping_address' => [
            'name' => 'Casey Buyer',
            'phone' => '2065550100',
            'line1' => '88 Harbor Ave',
            'city' => 'Seattle',
            'postal_code' => '98101',
            'country' => 'US',
        ],
    ])->assertCreated()
        ->assertJsonPath('data.status', 'paid')
        ->assertJsonPath('data.payment_status', 'completed');
});

test('buy now checks out only the selected cart item and leaves the rest', function () {
    $keep = ProductVariant::factory()
        ->for(Product::factory()->state(['name' => 'Canvas Tote']))
        ->create(['price' => '40.00', 'stock' => 6]);
    $buyNow = ProductVariant::factory()
        ->for(Product::factory()->state(['name' => 'Linen Overshirt']))
        ->create(['price' => '22.00', 'stock' => 6]);

    $this->postJson('/api/commerce/cart/items', [
        'variant_id' => $keep->id,
        'quantity' => 1,
    ])->assertSuccessful();

    $this->postJson('/api/commerce/cart/items', [
        'variant_id' => $buyNow->id,
        'quantity' => 1,
    ])->assertSuccessful();

    $itemId = collect($this->getJson('/api/commerce/cart')->json('data.items'))
        ->firstWhere('variant.id', $buyNow->id)['id'];

    $this->postJson('/api/commerce/checkout', [
        'shipping_address' => [
            'name' => 'Casey Buyer',
            'phone' => '2065550100',
            'line1' => '88 Harbor Ave',
            'city' => 'Seattle',
            'postal_code' => '98101',
            'country' => 'US',
        ],
        'item_ids' => [$itemId],
    ])->assertCreated()
        ->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.items.0.name', 'Linen Overshirt');

    $remaining = $this->getJson('/api/commerce/cart')->json('data.items');

    expect($remaining)->toHaveCount(1)
        ->and($remaining[0]['variant']['id'])->toBe($keep->id);
});

test('requires a phone number at checkout', function () {
    $variant = ProductVariant::factory()
        ->for(Product::factory())
        ->create(['price' => '22.00', 'stock' => 9]);

    $this->postJson('/api/commerce/cart/items', [
        'variant_id' => $variant->id,
        'quantity' => 1,
    ])->assertSuccessful();

    $this->postJson('/api/commerce/checkout', [
        'shipping_address' => [
            'name' => 'Casey Buyer',
            'line1' => '88 Harbor Ave',
            'city' => 'Seattle',
            'postal_code' => '98101',
            'country' => 'US',
        ],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['shipping_address.phone']);
});

test('returns 422 when checkout is submitted with an empty cart', function () {
    $this->postJson('/api/commerce/checkout', [
        'shipping_address' => [
            'name' => 'Casey Buyer',
            'phone' => '2065550100',
            'line1' => '88 Harbor Ave',
            'city' => 'Seattle',
            'postal_code' => '98101',
            'country' => 'US',
        ],
    ])->assertStatus(422);
});
