<?php

use App\Models\User;
use App\Support\Glb;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

/**
 * Builds a minimal but structurally valid .glb in memory (header + JSON chunk).
 *
 * @param  array<string, mixed>  $json
 */
function fakeGlb(array $json = ['asset' => ['version' => '2.0']], int $version = 2, ?int $declaredLength = null): string
{
    $body = json_encode($json);
    $body .= str_repeat(' ', (4 - strlen($body) % 4) % 4);
    $total = 12 + 8 + strlen($body);

    return pack('VVV', 0x46546C67, $version, $declaredLength ?? $total).pack('VV', strlen($body), 0x4E4F534A).$body;
}

function glbUpload(string $bytes, string $name = 'sofa.glb'): UploadedFile
{
    return UploadedFile::fake()->createWithContent($name, $bytes);
}

beforeEach(fn () => Storage::fake('local'));

test('admin uploads a valid .glb and it is then served publicly with the right headers', function () {
    Sanctum::actingAs(adminUser());
    $bytes = fakeGlb();

    $response = $this->postJson('/api/admin/models', ['model' => glbUpload($bytes)])->assertCreated();

    expect($response->json('data.url'))->toMatch('#^/api/commerce/models/[0-9a-f-]{36}\.glb$#')
        ->and($response->json('data.size'))->toBe(strlen($bytes));

    // fetched anonymously, as a shopper's browser would
    $this->app['auth']->forgetGuards();
    $served = $this->get($response->json('data.url'))->assertOk();

    expect($served->baseResponse->getFile()->getContent())->toBe($bytes);
    $served->assertHeader('Content-Type', 'model/gltf-binary')
        ->assertHeader('X-Content-Type-Options', 'nosniff');
    expect($served->headers->get('Cache-Control'))->toContain('immutable')->toContain('max-age=31536000');
});

test('the storefront origin may fetch a model cross-origin (CORS)', function () {
    Sanctum::actingAs(adminUser());
    $url = $this->postJson('/api/admin/models', ['model' => glbUpload(fakeGlb())])->json('data.url');

    $this->get($url, ['Origin' => config('app.frontend_url')])
        ->assertOk()
        ->assertHeader('Access-Control-Allow-Origin', config('app.frontend_url'));
});

test('damaged, wrong-version and tampered files are rejected', function (string $label, string $bytes) {
    Sanctum::actingAs(adminUser());

    $this->postJson('/api/admin/models', ['model' => glbUpload($bytes)])
        ->assertUnprocessable()->assertJsonValidationErrors('model');

    expect(Storage::disk('local')->allFiles('models'))->toBe([]);
})->with([
    'plain text renamed .glb' => ['text', 'definitely not a 3D model, just some text long enough'],
    'too small' => ['tiny', 'glTF'],
    'wrong version (glTF 1)' => ['v1', fakeGlb(version: 1)],
    'declared length lies' => ['length', fakeGlb(declaredLength: 9999)],
    'truncated' => ['truncated', substr(fakeGlb(), 0, 30)],
    'json chunk is not json' => ['badjson', (function () {
        $body = 'not json at all!!';
        $body .= str_repeat(' ', (4 - strlen($body) % 4) % 4);

        return pack('VVV', 0x46546C67, 2, 20 + strlen($body)).pack('VV', strlen($body), 0x4E4F534A).$body;
    })()],
    'asset version missing' => ['noasset', fakeGlb(['meshes' => []])],
    'external image on another site' => ['extimg', fakeGlb(['asset' => ['version' => '2.0'], 'images' => [['uri' => 'https://evil.example/track.png']]])],
    'external buffer file' => ['extbuf', fakeGlb(['asset' => ['version' => '2.0'], 'buffers' => [['uri' => 'model.bin', 'byteLength' => 4]]])],
]);

test('self-contained data: uris are allowed', function () {
    expect(Glb::problem(fakeGlb(['asset' => ['version' => '2.0'], 'images' => [['uri' => 'data:image/png;base64,AAAA']]])))->toBeNull();
});

test('missing file and oversized files are refused', function () {
    Sanctum::actingAs(adminUser());

    $this->postJson('/api/admin/models', [])->assertUnprocessable()->assertJsonValidationErrors('model');
    $this->postJson('/api/admin/models', ['model' => UploadedFile::fake()->create('huge.glb', 16000)])
        ->assertUnprocessable()->assertJsonPath('errors.model.0', 'The model is larger than 15 MB.');
});

test('only admins can upload', function () {
    $this->postJson('/api/admin/models', ['model' => glbUpload(fakeGlb())])->assertUnauthorized();

    Sanctum::actingAs(User::factory()->create());
    $this->postJson('/api/admin/models', ['model' => glbUpload(fakeGlb())])->assertForbidden();
    expect(Storage::disk('local')->allFiles('models'))->toBe([]);
});

test('model URLs only resolve for real uploaded uuids, never for paths', function (string $name) {
    Storage::disk('local')->put('models/secret.txt', 'private');

    $this->get('/api/commerce/models/'.$name)->assertNotFound();
})->with([
    'unknown but well-formed uuid' => ['3f2504e0-4f89-41d3-9a0c-0305e82c3301.glb'],
    'traversal' => ['..%2F..%2F.env'],
    'dot dot' => ['../secret.txt'],
    'not a uuid' => ['secret.txt'],
    'wrong extension' => ['3f2504e0-4f89-41d3-9a0c-0305e82c3301.php'],
    'uppercase uuid' => ['3F2504E0-4F89-41D3-9A0C-0305E82C3301.glb'],
]);

test('an uploaded model can be attached to a product and reaches the storefront', function () {
    Sanctum::actingAs(adminUser());
    $url = $this->postJson('/api/admin/models', ['model' => glbUpload(fakeGlb())])->json('data.url');

    $slug = $this->postJson('/api/admin/products', [
        'name' => 'Builder Sofa', 'status' => 'active',
        'model_url' => $url, 'ar_placement' => 'floor', 'width_cm' => 200, 'height_cm' => 85, 'depth_cm' => 90,
        'variants' => [['sku' => 'BS-1', 'price' => '999', 'stock' => 2]],
    ])->assertCreated()->json('data.slug');

    $this->getJson("/api/commerce/catalog/{$slug}")->assertOk()
        ->assertJsonPath('data.model_url', $url)
        ->assertJsonPath('data.ar_placement', 'floor');
});
