<?php

use App\Models\Product;
use Laravel\Sanctum\Sanctum;

function experiencePayload(array $extra = []): array
{
    return array_merge([
        'name' => 'Oak Bookshelf',
        'status' => 'active',
        'variants' => [['sku' => 'OAK-1', 'price' => '299.00', 'stock' => 3]],
    ], $extra);
}

test('admin stores AR placement, real-world size and try-on settings and the storefront exposes them', function () {
    Sanctum::actingAs(adminUser());

    $created = $this->postJson('/api/admin/products', experiencePayload([
        'model_url' => 'https://cdn.example.com/shelf.glb',
        'ar_placement' => 'wall',
        'width_cm' => 90,
        'height_cm' => '180.5',
        'depth_cm' => 35,
        'tryon_url' => '/garments/shirt.png',
        'tryon_type' => 'top',
    ]))->assertCreated()
        ->assertJsonPath('data.ar_placement', 'wall')
        ->assertJsonPath('data.width_cm', 90)
        ->assertJsonPath('data.height_cm', 180.5)
        ->assertJsonPath('data.tryon_type', 'top')
        ->assertJsonPath('data.tryon_url', '/garments/shirt.png');

    $this->getJson('/api/commerce/catalog/'.$created->json('data.slug'))->assertOk()
        ->assertJsonPath('data.ar_placement', 'wall')
        ->assertJsonPath('data.depth_cm', 35)
        ->assertJsonPath('data.tryon_type', 'top')
        ->assertJsonPath('data.tryon_url', '/garments/shirt.png')
        ->assertJsonPath('data.model_url', 'https://cdn.example.com/shelf.glb');
});

test('products without experience settings return nulls, not missing keys', function () {
    Sanctum::actingAs(adminUser());
    $created = $this->postJson('/api/admin/products', experiencePayload())->assertCreated();

    $this->getJson('/api/commerce/catalog/'.$created->json('data.slug'))->assertOk()
        ->assertJsonPath('data.tryon_url', null)
        ->assertJsonPath('data.ar_placement', null)
        ->assertJsonPath('data.width_cm', null);
});

test('rejects unsafe try-on links, unknown types and nonsense sizes', function () {
    Sanctum::actingAs(adminUser());

    foreach ([
        ['tryon_url' => 'javascript:alert(1)'],
        ['tryon_url' => 'http://insecure.test/a.png'],
        ['tryon_url' => 'data:image/png;base64,AAAA'],
        ['tryon_type' => 'shoes'],
        ['ar_placement' => 'ceiling'],
        ['width_cm' => 0],
        ['height_cm' => -5],
        ['depth_cm' => 'wide'],
        ['width_cm' => 99999],
    ] as $bad) {
        $this->postJson('/api/admin/products', experiencePayload($bad))
            ->assertUnprocessable()->assertJsonValidationErrors(array_key_first($bad));
    }
});

test('validation errors use friendly field names', function () {
    Sanctum::actingAs(adminUser());

    $this->postJson('/api/admin/products', experiencePayload(['tryon_url' => 'javascript:alert(1)', 'width_cm' => 0]))
        ->assertUnprocessable()
        ->assertJsonPath('errors.tryon_url.0', fn ($message) => str_contains($message, 'try-on image link') && ! str_contains($message, 'tryon url'))
        ->assertJsonPath('errors.width_cm.0', fn ($message) => str_contains($message, 'width'));
});

test('a partial update never wipes experience settings it did not mention', function () {
    Sanctum::actingAs(adminUser());
    $id = $this->postJson('/api/admin/products', experiencePayload([
        'tryon_url' => 'https://cdn.example.com/shirt.png',
        'tryon_type' => 'dress',
        'width_cm' => 50,
    ]))->assertCreated()->json('data.id');

    // Renaming without sending any experience field keeps them all.
    $this->patchJson("/api/admin/products/{$id}", ['name' => 'Renamed', 'status' => 'active'])->assertOk()
        ->assertJsonPath('data.tryon_type', 'dress')
        ->assertJsonPath('data.width_cm', 50);

    // Sending one field replaces the set, so clearing is explicit; unrelated meta survives.
    Product::query()->findOrFail($id)->forceFill(['meta' => array_merge(Product::query()->findOrFail($id)->meta, ['badge' => 'new'])])->save();
    $this->patchJson("/api/admin/products/{$id}", ['name' => 'Renamed', 'status' => 'active', 'tryon_url' => null, 'tryon_type' => null, 'width_cm' => null])->assertOk()
        ->assertJsonPath('data.tryon_url', null)->assertJsonPath('data.width_cm', null);

    expect(Product::query()->findOrFail($id)->meta)->toBe(['badge' => 'new']);
});
