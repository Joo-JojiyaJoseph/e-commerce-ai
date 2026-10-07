<?php

use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('reports gateway setup without ever exposing secrets', function () {
    Sanctum::actingAs(adminUser());
    config([
        'commerce.payments.razorpay.key_id' => 'rzp_test_ABCD1234',
        'commerce.payments.razorpay.key_secret' => 'SUPER_SECRET_VALUE',
        'commerce.payments.paypal.client_id' => null,
        'commerce.payments.stripe.key' => null,
    ]);

    $response = $this->getJson('/api/admin/integrations')->assertOk();
    $payments = collect($response->json('data.payments'))->keyBy('id');

    expect($payments['razorpay']['configured'])->toBeTrue()
        ->and($payments['razorpay']['mode'])->toBe('test')
        ->and($payments['razorpay']['key_hint'])->toBe('••••1234')
        ->and($payments['paypal']['configured'])->toBeFalse()
        ->and($payments['paypal']['missing'])->toContain('PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET')
        ->and($payments['razorpay']['webhook_url'])->toEndWith('/api/commerce/payments/webhooks/razorpay')
        ->and($payments['cod']['configured'])->toBeTrue();

    expect($response->getContent())->not->toContain('SUPER_SECRET_VALUE')->not->toContain('rzp_test_ABCD1234');
});

test('flags when only the built-in test gateway is active', function () {
    Sanctum::actingAs(adminUser());
    config(['commerce.payments.razorpay.key_id' => null, 'commerce.payments.paypal.client_id' => null, 'commerce.payments.stripe.key' => null]);

    $this->getJson('/api/admin/integrations')->assertOk()->assertJsonPath('data.using_test_gateway', true);
});

test('reports WhatsApp configuration state', function () {
    Sanctum::actingAs(adminUser());
    config(['services.whatsapp.token' => null, 'services.whatsapp.phone_number_id' => null, 'services.whatsapp.business_number' => '9876543210']);

    $this->getJson('/api/admin/integrations')->assertOk()
        ->assertJsonPath('data.whatsapp.api_configured', false)
        ->assertJsonPath('data.whatsapp.business_number', '919876543210')
        ->assertJsonPath('data.whatsapp.missing', ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID']);
});

test('integrations are admin-only', function () {
    $this->getJson('/api/admin/integrations')->assertUnauthorized();
    Sanctum::actingAs(User::factory()->create());
    $this->getJson('/api/admin/integrations')->assertForbidden();
});

test('public storefront config exposes only the WhatsApp number and flags', function () {
    config(['services.whatsapp.business_number' => '9876543210', 'services.whatsapp.token' => 'never-leak']);

    $response = $this->getJson('/api/commerce/storefront-config')->assertOk()->assertJsonPath('data.whatsapp_number', '919876543210');

    expect($response->getContent())->not->toContain('never-leak');
});
