<?php

use App\Models\User;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Webfolks\CommerceCore\Enums\PaymentStatus;
use Webfolks\CommerceCore\Models\Product;
use Webfolks\CommerceCore\Models\ProductVariant;

/**
 * @return array<string, string>
 */
function checkoutAddress(): array
{
    return [
        'name' => 'Casey Buyer',
        'phone' => '2065550100',
        'line1' => '88 Harbor Ave',
        'city' => 'Seattle',
        'postal_code' => '98101',
        'country' => 'US',
    ];
}

function addPaidItem(): ProductVariant
{
    return ProductVariant::factory()
        ->for(Product::factory())
        ->create(['price' => '22.00', 'stock' => 6]);
}

test('lists only configured payment methods', function () {
    config([
        'commerce.payments.razorpay.key_id' => 'rzp_test',
        'commerce.payments.razorpay.key_secret' => 'secret',
        'commerce.cod.enabled' => true,
    ]);

    $this->getJson('/api/commerce/payments/methods')
        ->assertOk()
        ->assertJsonPath('data.methods.0.id', 'razorpay')
        ->assertJsonFragment(['id' => 'cod']);
});

test('starts a razorpay order and confirms it after signature verification', function () {
    config([
        'commerce.payments.razorpay.key_id' => 'rzp_test',
        'commerce.payments.razorpay.key_secret' => 'rzp_secret',
    ]);

    Http::fake([
        'https://api.razorpay.com/v1/orders' => Http::response(['id' => 'order_rzp_1'], 200),
        'https://api.razorpay.com/v1/payments/pay_1' => Http::response([
            'id' => 'pay_1',
            'status' => 'captured',
            'amount' => 2700,
        ], 200),
    ]);

    $user = User::factory()->create();
    Sanctum::actingAs($user);
    $this->postJson('/api/commerce/cart/items', ['variant_id' => addPaidItem()->id, 'quantity' => 1])->assertSuccessful();

    $checkout = $this->postJson('/api/commerce/checkout', [
        'shipping_address' => checkoutAddress(),
        'payment' => ['method' => 'razorpay'],
    ])->assertCreated()
        ->assertJsonPath('data.payment_status', PaymentStatus::Pending->value)
        ->assertJsonPath('data.payment_gateway', 'razorpay')
        ->assertJsonPath('data.payment.order_id', 'order_rzp_1');

    $number = $checkout->json('data.number');
    $signature = hash_hmac('sha256', 'order_rzp_1|pay_1', 'rzp_secret');

    $this->postJson('/api/commerce/payments/confirm', [
        'order_number' => $number,
        'razorpay_order_id' => 'order_rzp_1',
        'razorpay_payment_id' => 'pay_1',
        'razorpay_signature' => $signature,
    ])->assertOk()
        ->assertJsonPath('data.payment_status', PaymentStatus::Completed->value);

    $this->postJson('/api/commerce/payments/confirm', [
        'order_number' => $number,
        'razorpay_order_id' => 'order_rzp_1',
        'razorpay_payment_id' => 'pay_1',
        'razorpay_signature' => $signature,
    ])->assertOk()
        ->assertJsonPath('data.payment_status', PaymentStatus::Completed->value);
});

test('rejects an invalid razorpay signature', function () {
    config([
        'commerce.payments.razorpay.key_id' => 'rzp_test',
        'commerce.payments.razorpay.key_secret' => 'rzp_secret',
    ]);

    Http::fake([
        'https://api.razorpay.com/v1/orders' => Http::response(['id' => 'order_rzp_1'], 200),
    ]);

    Sanctum::actingAs(User::factory()->create());
    $this->postJson('/api/commerce/cart/items', ['variant_id' => addPaidItem()->id, 'quantity' => 1])->assertSuccessful();

    $number = $this->postJson('/api/commerce/checkout', [
        'shipping_address' => checkoutAddress(),
        'payment' => ['method' => 'razorpay'],
    ])->json('data.number');

    $this->postJson('/api/commerce/payments/confirm', [
        'order_number' => $number,
        'razorpay_order_id' => 'order_rzp_1',
        'razorpay_payment_id' => 'pay_1',
        'razorpay_signature' => 'invalid',
    ])->assertUnprocessable();
});

test('starts stripe checkout and confirms a paid session', function () {
    config([
        'commerce.payments.stripe.secret' => 'sk_test_123',
        'commerce.payments.stripe.key' => 'pk_test_123',
    ]);

    $orderNumber = 'PENDING';

    Http::fake(function (Request $request) use (&$orderNumber) {
        if ($request->method() === 'POST' && str_ends_with(rtrim($request->url(), '/'), '/v1/checkout/sessions')) {
            return Http::response([
                'id' => 'cs_test_1',
                'url' => 'https://checkout.stripe.com/c/pay/cs_test_1',
            ], 200);
        }

        if ($request->method() === 'GET' && str_contains($request->url(), '/v1/checkout/sessions/cs_test_1')) {
            return Http::response([
                'id' => 'cs_test_1',
                'payment_status' => 'paid',
                'client_reference_id' => $orderNumber,
                'amount_total' => 2700,
                'payment_intent' => 'pi_test_1',
            ], 200);
        }

        return Http::response(['error' => ['message' => 'Unexpected Stripe request']], 500);
    });

    Sanctum::actingAs(User::factory()->create());
    $this->postJson('/api/commerce/cart/items', ['variant_id' => addPaidItem()->id, 'quantity' => 1])->assertSuccessful();

    $checkout = $this->postJson('/api/commerce/checkout', [
        'shipping_address' => checkoutAddress(),
        'payment' => ['method' => 'stripe'],
    ])->assertCreated()
        ->assertJsonPath('data.payment.checkout_url', 'https://checkout.stripe.com/c/pay/cs_test_1');

    $orderNumber = $checkout->json('data.number');

    $this->postJson('/api/commerce/payments/confirm', [
        'order_number' => $orderNumber,
        'session_id' => 'cs_test_1',
    ])->assertOk()
        ->assertJsonPath('data.payment_status', 'completed');
});

test('starts paypal checkout and confirms a capture', function () {
    config([
        'commerce.payments.paypal.client_id' => 'client',
        'commerce.payments.paypal.client_secret' => 'secret',
        'commerce.payments.paypal.mode' => 'sandbox',
    ]);

    $orderNumber = 'PENDING';

    Http::fake(function (Request $request) use (&$orderNumber) {
        if (str_contains($request->url(), '/v1/oauth2/token')) {
            return Http::response(['access_token' => 'token', 'expires_in' => 300], 200);
        }

        if ($request->method() === 'POST' && str_ends_with(rtrim($request->url(), '/'), '/v2/checkout/orders')) {
            return Http::response([
                'id' => 'PAYPAL-ORDER',
                'links' => [[
                    'rel' => 'payer-action',
                    'href' => 'https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-ORDER',
                ]],
            ], 200);
        }

        if (str_contains($request->url(), '/v2/checkout/orders/PAYPAL-ORDER/capture')) {
            return Http::response([
                'id' => 'PAYPAL-ORDER',
                'status' => 'COMPLETED',
                'purchase_units' => [[
                    'reference_id' => $orderNumber,
                    'payments' => [
                        'captures' => [[
                            'id' => 'CAP-1',
                            'amount' => ['value' => '27.00', 'currency_code' => 'USD'],
                        ]],
                    ],
                ]],
            ], 200);
        }

        return Http::response(['message' => 'Unexpected PayPal request'], 500);
    });

    Sanctum::actingAs(User::factory()->create());
    $this->postJson('/api/commerce/cart/items', ['variant_id' => addPaidItem()->id, 'quantity' => 1])->assertSuccessful();

    $checkout = $this->postJson('/api/commerce/checkout', [
        'shipping_address' => checkoutAddress(),
        'payment' => ['method' => 'paypal'],
    ])->assertCreated()
        ->assertJsonPath('data.payment_gateway', 'paypal');

    $orderNumber = $checkout->json('data.number');

    $this->postJson('/api/commerce/payments/confirm', [
        'order_number' => $orderNumber,
        'paypal_order_id' => 'PAYPAL-ORDER',
    ])->assertOk()
        ->assertJsonPath('data.payment_status', 'completed');
});

test('a customer cannot confirm another customer order', function () {
    config([
        'commerce.payments.razorpay.key_id' => 'rzp_test',
        'commerce.payments.razorpay.key_secret' => 'rzp_secret',
    ]);

    Http::fake([
        'https://api.razorpay.com/v1/orders' => Http::response(['id' => 'order_rzp_1'], 200),
    ]);

    $owner = User::factory()->create();
    Sanctum::actingAs($owner);
    $this->postJson('/api/commerce/cart/items', ['variant_id' => addPaidItem()->id, 'quantity' => 1])->assertSuccessful();

    $number = $this->postJson('/api/commerce/checkout', [
        'shipping_address' => checkoutAddress(),
        'payment' => ['method' => 'razorpay'],
    ])->json('data.number');

    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/commerce/payments/confirm', [
        'order_number' => $number,
        'razorpay_order_id' => 'order_rzp_1',
        'razorpay_payment_id' => 'pay_1',
        'razorpay_signature' => hash_hmac('sha256', 'order_rzp_1|pay_1', 'rzp_secret'),
    ])->assertForbidden();
});
