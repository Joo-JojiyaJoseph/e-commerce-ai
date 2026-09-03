<?php

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Webfolks\CommerceCore\Enums\ProductStatus;
use Webfolks\CommerceCore\Models\ProductVariant;

test('rejects admin catalog access for customers', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->getJson('/api/admin/dashboard')->assertForbidden();
});

test('lets an admin create a product with multiple images', function () {
    Storage::fake('public');
    Sanctum::actingAs(adminUser());

    $brand = Brand::query()->create(['name' => 'Northloom', 'slug' => 'northloom', 'is_active' => true]);
    $category = Category::query()->create(['name' => 'Shirts', 'slug' => 'shirts', 'is_active' => true]);

    $create = $this->postJson('/api/admin/products', [
        'name' => 'Field Shirt',
        'slug' => 'field-shirt',
        'description' => 'Washed cotton.',
        'status' => ProductStatus::Active->value,
        'brand_id' => $brand->id,
        'category_ids' => [$category->id],
        'variants' => [[
            'sku' => 'FIELD-SHIRT-01',
            'price' => '1999.00',
            'compare_at_price' => '2499.00',
            'stock' => 12,
            'attributes' => ['color' => 'sand'],
        ]],
    ])->assertCreated();

    $productId = $create->json('data.id');

    $this->post('/api/admin/products/'.$productId.'/images', [
        'image' => UploadedFile::fake()->image('front.jpg', 800, 800),
        'is_primary' => true,
    ], ['Accept' => 'application/json'])->assertCreated();

    $second = $this->post('/api/admin/products/'.$productId.'/images', [
        'image' => UploadedFile::fake()->image('back.jpg', 800, 800),
    ], ['Accept' => 'application/json'])->assertCreated();

    $this->getJson('/api/admin/products/'.$productId)
        ->assertOk()
        ->assertJsonPath('data.images.0.is_primary', true)
        ->assertJsonCount(2, 'data.images');

    $this->postJson('/api/admin/products/'.$productId.'/images/'.$second->json('data.id').'/primary')
        ->assertOk()
        ->assertJsonPath('data.is_primary', true);

    $this->getJson('/api/commerce/catalog/field-shirt')
        ->assertOk()
        ->assertJsonCount(2, 'data.images');
});

test('soft deletes and restores a product', function () {
    Sanctum::actingAs(adminUser());
    $product = Product::factory()->create(['status' => ProductStatus::Active]);
    ProductVariant::factory()->create(['product_id' => $product->id]);

    $this->deleteJson('/api/admin/products/'.$product->id)->assertOk();
    $this->assertSoftDeleted('products', ['id' => $product->id]);

    $this->postJson('/api/admin/products/'.$product->id.'/restore')->assertOk();
    $this->assertDatabaseHas('products', ['id' => $product->id, 'deleted_at' => null]);
});

test('admin can approve a pending review so it becomes public', function () {
    $customer = User::factory()->create();
    $product = Product::factory()->create(['slug' => 'linen-overshirt']);
    ProductVariant::factory()->create(['product_id' => $product->id]);

    Sanctum::actingAs($customer);
    $created = $this->postJson('/api/commerce/products/linen-overshirt/reviews', [
        'rating' => 5,
        'title' => 'Excellent',
        'body' => 'Holds its shape.',
    ])->assertCreated();

    $this->getJson('/api/commerce/products/linen-overshirt/reviews')->assertJsonCount(0, 'data');

    Sanctum::actingAs(adminUser());
    $this->postJson('/api/admin/reviews/'.$created->json('data.id').'/approve')->assertOk();

    $this->getJson('/api/commerce/products/linen-overshirt/reviews')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    expect(Review::query()->find($created->json('data.id'))?->status)->toBe('approved');
});
