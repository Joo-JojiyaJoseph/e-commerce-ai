<?php

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Facades\Mail;
use Webfolks\CommerceCore\Enums\ProductStatus;
use Webfolks\CommerceCore\Models\ProductVariant;

test('suggests matching products categories and brands', function () {
    $brand = Brand::query()->create(['name' => 'Northloom', 'slug' => 'northloom']);
    Category::query()->create(['name' => 'Shirts', 'slug' => 'shirts', 'is_active' => true]);

    $product = Product::query()->findOrFail(
        Product::factory()->create([
            'name' => 'Linen Overshirt',
            'slug' => 'linen-overshirt',
            'status' => ProductStatus::Active,
        ])->id,
    );
    $product->forceFill(['brand_id' => $brand->id])->save();
    ProductVariant::factory()->create(['product_id' => $product->id, 'price' => '40.00']);

    $this->getJson('/api/commerce/suggest?q=lin')
        ->assertOk()
        ->assertJsonPath('data.products.0.slug', 'linen-overshirt')
        ->assertJsonPath('data.query', 'lin');
});

test('accepts a contact message', function () {
    Mail::fake();

    $this->postJson('/api/contact', [
        'name' => 'Asha Buyer',
        'email' => 'asha@example.com',
        'subject' => 'Sizing',
        'message' => 'Does the overshirt run large?',
    ])->assertCreated()
        ->assertJsonPath('message', 'Thanks. We received your message and will reply by email.');
});

test('rejects a contact honeypot submission', function () {
    Mail::fake();

    $this->postJson('/api/contact', [
        'name' => 'Asha Buyer',
        'email' => 'asha@example.com',
        'subject' => 'Sizing',
        'message' => 'Does the overshirt run large?',
        'website' => 'https://spam.example',
    ])->assertUnprocessable();
});

test('rejects an invalid contact email', function () {
    $this->postJson('/api/contact', [
        'name' => 'Asha Buyer',
        'email' => 'not-an-email',
        'subject' => 'Sizing',
        'message' => 'Does the overshirt run large?',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});
