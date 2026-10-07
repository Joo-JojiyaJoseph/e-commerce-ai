<?php

use App\Models\User;
use App\Services\WhatsAppService;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Webfolks\CommerceCore\Models\Order;

function orderWithPhone(string $phone = '98765 43210'): Order
{
    return Order::factory()->create([
        'number' => 'ORD-20260101-ABC123',
        'shipping_address' => ['name' => 'Asha Nair', 'phone' => $phone, 'line1' => '1 Main St', 'city' => 'Kochi', 'postal_code' => '682001', 'country' => 'IN'],
    ]);
}

test('normalises phone numbers for wa.me', function (string $input, ?string $expected) {
    config(['services.whatsapp.default_country_code' => '91']);

    expect(app(WhatsAppService::class)->normalizePhone($input))->toBe($expected);
})->with([
    'plain 10 digit gets country code' => ['98765 43210', '919876543210'],
    'leading zero is dropped' => ['098765 43210', '919876543210'],
    'plus international kept' => ['+1 (415) 555-0100', '14155550100'],
    '00 prefix international' => ['0044 20 7946 0958', '442079460958'],
    'too short is rejected' => ['123', null],
    'blank is rejected' => ['', null],
]);

test('admin gets a click-to-chat link with a prefilled order message', function () {
    Sanctum::actingAs(adminUser());
    orderWithPhone();

    $response = $this->getJson('/api/admin/orders/ORD-20260101-ABC123/whatsapp')->assertOk();

    expect($response->json('data.phone'))->toBe('919876543210')
        ->and($response->json('data.link'))->toStartWith('https://wa.me/919876543210?text=')
        ->and($response->json('data.message'))->toContain('Asha Nair')->toContain('ORD-20260101-ABC123')
        ->and($response->json('data.api_configured'))->toBeFalse();
});

test('sending through the Cloud API is refused until it is configured', function () {
    Sanctum::actingAs(adminUser());
    orderWithPhone();
    Http::fake();

    $this->postJson('/api/admin/orders/ORD-20260101-ABC123/whatsapp')->assertUnprocessable();
    Http::assertNothingSent();
});

test('sends a WhatsApp message through the Cloud API when configured', function () {
    Sanctum::actingAs(adminUser());
    orderWithPhone();
    config(['services.whatsapp.token' => 'secret-token', 'services.whatsapp.phone_number_id' => '12345']);
    Http::fake(['graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.1']]], 200)]);

    $this->postJson('/api/admin/orders/ORD-20260101-ABC123/whatsapp', ['message' => 'Your parcel is on the way'])
        ->assertOk()->assertJsonPath('data.sent', true);

    Http::assertSent(fn ($request) => str_contains($request->url(), '/12345/messages')
        && $request->hasHeader('Authorization', 'Bearer secret-token')
        && $request['to'] === '919876543210'
        && $request['text']['body'] === 'Your parcel is on the way');
});

test('surfaces a Cloud API failure as a 422 instead of pretending it was sent', function () {
    Sanctum::actingAs(adminUser());
    orderWithPhone();
    config(['services.whatsapp.token' => 't', 'services.whatsapp.phone_number_id' => '1']);
    Http::fake(['graph.facebook.com/*' => Http::response(['error' => ['message' => 'Recipient not in allowed list']], 400)]);

    $this->postJson('/api/admin/orders/ORD-20260101-ABC123/whatsapp')
        ->assertUnprocessable()
        ->assertJsonPath('data.sent', false)
        ->assertJsonPath('data.reason', 'Recipient not in allowed list');
});

test('order status updates auto-notify on WhatsApp only when enabled, and never block the update', function () {
    Sanctum::actingAs(adminUser());
    orderWithPhone();
    config(['services.whatsapp.token' => 't', 'services.whatsapp.phone_number_id' => '1']);
    Http::fake(['graph.facebook.com/*' => Http::response([], 500)]);

    config(['services.whatsapp.auto_notify' => false]);
    $this->patchJson('/api/admin/orders/ORD-20260101-ABC123/status', ['status' => 'packed'])->assertOk();
    Http::assertNothingSent();

    config(['services.whatsapp.auto_notify' => true]);
    $this->patchJson('/api/admin/orders/ORD-20260101-ABC123/status', ['status' => 'shipped'])
        ->assertOk()->assertJsonPath('data.status', 'shipped');
    Http::assertSentCount(1);
});

test('whatsapp admin endpoints are admin-only', function () {
    orderWithPhone();

    $this->getJson('/api/admin/orders/ORD-20260101-ABC123/whatsapp')->assertUnauthorized();
    Sanctum::actingAs(User::factory()->create());
    $this->getJson('/api/admin/orders/ORD-20260101-ABC123/whatsapp')->assertForbidden();
});
