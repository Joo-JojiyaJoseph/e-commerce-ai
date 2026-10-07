<?php

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Webfolks\CommerceCore\Enums\OrderStatus;
use Webfolks\CommerceCore\Enums\ProductStatus;
use Webfolks\CommerceCore\Models\Order;
use Webfolks\CommerceCore\Models\ProductVariant;

test('filters admin orders by status, gateway, date range and amount', function () {
    Sanctum::actingAs(adminUser());

    Order::factory()->create(['number' => 'ORD-A', 'total' => '100.00', 'payment_gateway' => 'cod', 'created_at' => now()->subDays(10)]);
    Order::factory()->create(['number' => 'ORD-B', 'total' => '900.00', 'payment_gateway' => 'razorpay', 'status' => OrderStatus::Shipped, 'created_at' => now()]);

    $this->getJson('/api/admin/orders?gateway=razorpay')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.number', 'ORD-B');
    $this->getJson('/api/admin/orders?status=shipped')->assertOk()->assertJsonCount(1, 'data');
    $this->getJson('/api/admin/orders?min_total=500')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.number', 'ORD-B');
    $this->getJson('/api/admin/orders?max_total=500')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.number', 'ORD-A');
    $this->getJson('/api/admin/orders?date_from='.now()->subDays(2)->toDateString())->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.number', 'ORD-B');
    $this->getJson('/api/admin/orders?date_to='.now()->subDays(5)->toDateString())->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.number', 'ORD-A');
});

test('rejects malformed filter values instead of erroring', function () {
    Sanctum::actingAs(adminUser());

    $this->getJson('/api/admin/orders?date_from=not-a-date')->assertUnprocessable();
    $this->getJson('/api/admin/orders?min_total=abc')->assertUnprocessable();
});

test('supports per_page for exports but caps it at 200', function () {
    Sanctum::actingAs(adminUser());
    Order::factory()->count(3)->create();

    $this->getJson('/api/admin/orders?per_page=2')->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('meta.per_page', 2);
    $this->getJson('/api/admin/orders?per_page=9999')->assertOk()->assertJsonPath('meta.per_page', 200);
});

test('filters admin products by status, brand, stock level and category including subcategories', function () {
    Sanctum::actingAs(adminUser());

    $brand = Brand::query()->create(['name' => 'Northloom', 'slug' => 'northloom']);
    $knitwear = Category::query()->create(['name' => 'Knitwear', 'slug' => 'knitwear', 'is_active' => true]);
    $sweaters = Category::query()->create(['name' => 'Sweaters', 'slug' => 'sweaters', 'parent_id' => $knitwear->id, 'is_active' => true]);

    $make = function (string $name, ProductStatus $status, int $stock) {
        $product = Product::factory()->create(['name' => $name, 'slug' => str($name)->slug(), 'status' => $status]);
        ProductVariant::factory()->create(['product_id' => $product->id, 'stock' => $stock]);

        return Product::query()->findOrFail($product->id);
    };

    $crew = $make('Crew', ProductStatus::Active, 8);
    $crew->forceFill(['brand_id' => $brand->id])->save();
    $crew->categories()->attach($sweaters->id);

    $make('Draft Tote', ProductStatus::Draft, 0);
    $make('Low Cap', ProductStatus::Active, 3);

    $this->getJson('/api/admin/products?status=draft')->assertOk()->assertJsonCount(1, 'data');
    $this->getJson("/api/admin/products?brand_id={$brand->id}")->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Crew');
    $this->getJson('/api/admin/products?stock=out')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Draft Tote');
    $this->getJson('/api/admin/products?stock=low')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Low Cap');
    $this->getJson("/api/admin/products?category_id={$sweaters->id}")->assertOk()->assertJsonCount(1, 'data');
    // Filtering by the PARENT still finds products that live in the subcategory.
    $this->getJson("/api/admin/products?category_id={$knitwear->id}")->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Crew');
});

test('filters customers, reviews, coupons and categories', function () {
    Sanctum::actingAs(adminUser());

    User::factory()->create(['name' => 'Old Customer', 'created_at' => now()->subMonths(2)]);
    $this->getJson('/api/admin/customers?date_from='.now()->subDay()->toDateString())->assertOk()->assertJsonMissing(['name' => 'Old Customer']);

    $top = Category::query()->create(['name' => 'Bags', 'slug' => 'bags', 'is_active' => true]);
    Category::query()->create(['name' => 'Totes', 'slug' => 'totes', 'parent_id' => $top->id, 'is_active' => false]);

    $this->getJson('/api/admin/categories?parent_id=root')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.slug', 'bags')->assertJsonPath('data.0.children_count', 1);
    $this->getJson("/api/admin/categories?parent_id={$top->id}")->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.slug', 'totes');
    $this->getJson('/api/admin/categories?active=0')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.slug', 'totes');
});

test('admin order list includes date and customer email, and search matches the email', function () {
    Sanctum::actingAs(adminUser());

    $buyer = User::factory()->create(['email' => 'asha.buyer@example.com']);
    Order::factory()->create(['number' => 'ORD-MINE', 'user_id' => $buyer->id]);
    Order::factory()->create(['number' => 'ORD-OTHER', 'user_id' => null]);

    $rows = collect($this->getJson('/api/admin/orders')->assertOk()->json('data'))->keyBy('number');
    expect($rows['ORD-MINE']['customer_email'])->toBe('asha.buyer@example.com')
        ->and($rows['ORD-MINE']['created_at'])->not->toBeNull()
        ->and($rows['ORD-OTHER']['customer_email'])->toBeNull();

    $this->getJson('/api/admin/orders?q=asha.buyer')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.number', 'ORD-MINE');
});
