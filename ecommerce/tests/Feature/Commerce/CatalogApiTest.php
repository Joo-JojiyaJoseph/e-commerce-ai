<?php

use App\Models\Product;
use Webfolks\CommerceCore\Enums\ProductStatus;
use Webfolks\CommerceCore\Models\ProductVariant;

test('lists active products through the commerce catalog api', function () {
    $visible = Product::factory()->create(['name' => 'Visible Shirt', 'status' => ProductStatus::Active]);
    ProductVariant::factory()->recycle($visible)->create(['price' => '40.00']);
    Product::factory()->draft()->create(['name' => 'Hidden Draft']);

    $this->getJson('/api/commerce/products')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', $visible->slug);
});

test('shows a product by slug', function () {
    $product = Product::factory()->create(['slug' => 'canvas-tote']);
    ProductVariant::factory()->recycle($product)->create();

    $this->getJson('/api/commerce/products/canvas-tote')
        ->assertOk()
        ->assertJsonPath('data.slug', 'canvas-tote');
});
