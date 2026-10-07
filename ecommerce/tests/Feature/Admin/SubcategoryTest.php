<?php

use App\Models\Category;
use App\Models\Product;
use Laravel\Sanctum\Sanctum;
use Webfolks\CommerceCore\Enums\ProductStatus;
use Webfolks\CommerceCore\Models\ProductVariant;

function categoryTree(): array
{
    $knitwear = Category::query()->create(['name' => 'Knitwear', 'slug' => 'knitwear', 'is_active' => true]);
    $sweaters = Category::query()->create(['name' => 'Sweaters', 'slug' => 'sweaters', 'parent_id' => $knitwear->id, 'is_active' => true]);
    $crew = Category::query()->create(['name' => 'Crew necks', 'slug' => 'crew-necks', 'parent_id' => $sweaters->id, 'is_active' => true]);

    return [$knitwear, $sweaters, $crew];
}

test('descendantIdsOf walks every nested level and is cycle-safe', function () {
    [$knitwear, $sweaters, $crew] = categoryTree();

    expect(Category::descendantIdsOf([$knitwear->id]))->toEqualCanonicalizing([$knitwear->id, $sweaters->id, $crew->id]);
    expect(Category::descendantIdsOf([$crew->id]))->toBe([$crew->id]);

    // Corrupt the tree into a loop: it must still terminate.
    $knitwear->forceFill(['parent_id' => $crew->id])->save();
    expect(Category::descendantIdsOf([$knitwear->id]))->toHaveCount(3);
});

test('storefront filtering by a parent category includes subcategory products', function () {
    [$knitwear, , $crew] = categoryTree();

    $product = Product::query()->findOrFail(Product::factory()->create(['name' => 'Merino Crew', 'slug' => 'merino-crew', 'status' => ProductStatus::Active])->id);
    $product->categories()->attach($crew->id);
    ProductVariant::factory()->create(['product_id' => $product->id, 'price' => '40.00', 'stock' => 3]);

    $this->getJson('/api/commerce/shop?category=knitwear')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.slug', 'merino-crew');
    $this->getJson('/api/commerce/shop?category=crew-necks')->assertOk()->assertJsonCount(1, 'data');
    $this->getJson('/api/commerce/shop?category=sweaters')->assertOk()->assertJsonCount(1, 'data');
});

test('storefront categories expose parent_id, children and a roll-up product count', function () {
    [$knitwear, $sweaters, $crew] = categoryTree();

    $product = Product::query()->findOrFail(Product::factory()->create(['status' => ProductStatus::Active])->id);
    $product->categories()->attach($crew->id);
    ProductVariant::factory()->create(['product_id' => $product->id, 'stock' => 2]);

    $rows = collect($this->getJson('/api/commerce/categories')->assertOk()->json('data'))->keyBy('slug');

    expect($rows['knitwear']['parent_id'])->toBeNull()
        ->and($rows['knitwear']['children'])->toHaveCount(1)
        ->and($rows['knitwear']['children'][0]['slug'])->toBe('sweaters')
        ->and($rows['knitwear']['products_count'])->toBe(1)
        ->and($rows['sweaters']['parent_id'])->toBe($knitwear->id)
        ->and($rows['crew-necks']['products_count'])->toBe(1);
});

test('admin cannot make a category its own parent or move it under a descendant', function () {
    Sanctum::actingAs(adminUser());
    [$knitwear, $sweaters, $crew] = categoryTree();

    $payload = fn (array $extra) => array_merge(['name' => 'Knitwear', 'slug' => 'knitwear', 'is_active' => true], $extra);

    $this->patchJson("/api/admin/categories/{$knitwear->id}", $payload(['parent_id' => $knitwear->id]))->assertUnprocessable()->assertJsonValidationErrors('parent_id');
    $this->patchJson("/api/admin/categories/{$knitwear->id}", $payload(['parent_id' => $crew->id]))->assertUnprocessable()->assertJsonValidationErrors('parent_id');

    // A legitimate re-parent still works.
    $this->patchJson("/api/admin/categories/{$crew->id}", ['name' => 'Crew necks', 'slug' => 'crew-necks', 'is_active' => true, 'parent_id' => $knitwear->id])->assertOk();
});

test('admin can attach a product to a subcategory and store 3D/AR model links', function () {
    Sanctum::actingAs(adminUser());
    [, $sweaters] = categoryTree();

    $create = $this->postJson('/api/admin/products', [
        'name' => 'Chunky Crew',
        'status' => 'active',
        'category_ids' => [$sweaters->id],
        'model_url' => 'https://cdn.example.com/models/crew.glb',
        'model_ios_url' => 'https://cdn.example.com/models/crew.usdz',
        'variants' => [['sku' => 'CRW-1', 'price' => '49.00', 'stock' => 4]],
    ])->assertCreated()
        ->assertJsonPath('data.model_url', 'https://cdn.example.com/models/crew.glb')
        ->assertJsonPath('data.categories.0.id', $sweaters->id);

    $slug = $create->json('data.slug');
    $id = $create->json('data.id');

    $this->getJson("/api/commerce/catalog/{$slug}")->assertOk()
        ->assertJsonPath('data.model_url', 'https://cdn.example.com/models/crew.glb')
        ->assertJsonPath('data.model_ios_url', 'https://cdn.example.com/models/crew.usdz');

    // Clearing the link removes it; unrelated meta survives.
    Product::query()->findOrFail($id)->forceFill(['meta' => ['model_url' => 'https://x.test/a.glb', 'badge' => 'new']])->save();
    $this->patchJson("/api/admin/products/{$id}", ['name' => 'Chunky Crew', 'status' => 'active', 'model_url' => null, 'model_ios_url' => null])->assertOk()->assertJsonPath('data.model_url', null);
    expect(Product::query()->findOrFail($id)->meta)->toBe(['badge' => 'new']);
});

test('rejects unsafe model URLs', function () {
    Sanctum::actingAs(adminUser());

    foreach (['javascript:alert(1)', 'http://insecure.test/a.glb', 'data:text/html,hi', 'ftp://x/a.glb'] as $bad) {
        $this->postJson('/api/admin/products', ['name' => 'X', 'status' => 'draft', 'model_url' => $bad])
            ->assertUnprocessable()->assertJsonValidationErrors('model_url');
    }
});
