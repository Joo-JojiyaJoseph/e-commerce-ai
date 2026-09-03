<?php

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Support\DemoCatalog;
use Webfolks\CommerceCore\Enums\ProductStatus;
use Webfolks\CommerceCore\Models\ProductVariant;

test('filters the shop catalog by category brand and price', function () {
    $brand = Brand::query()->create(['name' => 'Northloom', 'slug' => 'northloom']);
    $shirts = Category::query()->create(['name' => 'Shirts', 'slug' => 'shirts', 'is_active' => true]);

    $match = Product::query()->findOrFail(
        Product::factory()->create([
            'name' => 'Linen Overshirt',
            'slug' => 'linen-overshirt',
            'status' => ProductStatus::Active,
        ])->id,
    );
    $match->forceFill(['brand_id' => $brand->id])->save();
    $match->categories()->attach($shirts->id);
    ProductVariant::factory()->create(['product_id' => $match->id, 'price' => '40.00', 'stock' => 3]);

    $other = Product::factory()->create([
        'name' => 'Canvas Tote',
        'status' => ProductStatus::Active,
    ]);
    ProductVariant::factory()->recycle($other)->create(['price' => '90.00', 'stock' => 3]);

    $this->getJson('/api/commerce/shop?category=shirts&brand=northloom&max_price=50')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', 'linen-overshirt');
});

test('understands a simple natural language price query', function () {
    $cheap = Product::factory()->create(['name' => 'Merino Beanie', 'status' => ProductStatus::Active]);
    ProductVariant::factory()->recycle($cheap)->create(['price' => '28.00']);

    $expensive = Product::factory()->create(['name' => 'Cashmere Crew', 'status' => ProductStatus::Active]);
    ProductVariant::factory()->recycle($expensive)->create(['price' => '90.00']);

    $this->getJson('/api/commerce/shop?q='.urlencode('beanie under $30'))
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', $cheap->slug);
});

test('returns homepage catalog sections', function () {
    $product = Product::factory()->create(['status' => ProductStatus::Active]);
    ProductVariant::factory()->recycle($product)->create(['price' => '22.00']);

    $this->getJson('/api/commerce/home')
        ->assertOk()
        ->assertJsonStructure(['data' => ['categories', 'brands', 'new_arrivals', 'trending']]);
});

test('storefront categories include a product count and image', function () {
    $shirts = Category::query()->create(['name' => 'Shirts', 'slug' => 'shirts-home', 'is_active' => true]);
    $product = Product::query()->findOrFail(
        Product::factory()->create([
            'status' => ProductStatus::Active,
        ])->id,
    );
    $product->forceFill(['image_url' => 'https://example.test/shirt.jpg'])->save();
    $product->categories()->attach($shirts->id);
    ProductVariant::factory()->recycle($product)->create(['price' => '22.00']);

    $this->getJson('/api/commerce/categories')
        ->assertOk()
        ->assertJsonFragment([
            'slug' => 'shirts-home',
            'products_count' => 1,
            'image_url' => 'https://example.test/shirt.jpg',
        ]);
});

test('storefront uses demo photography for known category and brand slugs', function () {
    Category::query()->create(['name' => 'Shirts', 'slug' => 'shirts', 'is_active' => true]);
    Brand::query()->create(['name' => 'Northloom', 'slug' => 'northloom', 'is_active' => true]);

    $this->getJson('/api/commerce/categories')
        ->assertOk()
        ->assertJsonFragment([
            'slug' => 'shirts',
            'image_url' => DemoCatalog::categoryImages()['shirts'],
        ]);

    $this->getJson('/api/commerce/brands')
        ->assertOk()
        ->assertJsonFragment([
            'slug' => 'northloom',
            'logo_url' => DemoCatalog::brandImages()['northloom'],
        ]);
});
