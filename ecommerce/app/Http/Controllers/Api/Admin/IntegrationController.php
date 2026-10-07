<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;

/**
 * Read-only setup status for payment gateways and WhatsApp.
 *
 * Secrets stay in the server's .env file and are never returned: the admin UI only learns
 * whether each key is present, which ones are missing, and the webhook URLs to register.
 */
class IntegrationController extends Controller
{
    public function index(WhatsAppService $whatsapp): JsonResponse
    {
        $gateways = [
            'razorpay' => [
                'label' => 'Razorpay',
                'description' => 'UPI, cards, netbanking and wallets (India).',
                'keys' => ['RAZORPAY_KEY_ID' => 'commerce.payments.razorpay.key_id', 'RAZORPAY_KEY_SECRET' => 'commerce.payments.razorpay.key_secret', 'RAZORPAY_WEBHOOK_SECRET' => 'commerce.payments.razorpay.webhook_secret'],
                'required' => ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'],
                'hint_key' => 'commerce.payments.razorpay.key_id',
                'docs' => 'https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/',
                'mode' => str_starts_with((string) config('commerce.payments.razorpay.key_id'), 'rzp_live') ? 'live' : 'test',
            ],
            'paypal' => [
                'label' => 'PayPal',
                'description' => 'PayPal balance or linked cards, worldwide.',
                'keys' => ['PAYPAL_CLIENT_ID' => 'commerce.payments.paypal.client_id', 'PAYPAL_CLIENT_SECRET' => 'commerce.payments.paypal.client_secret', 'PAYPAL_WEBHOOK_ID' => 'commerce.payments.paypal.webhook_id'],
                'required' => ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'],
                'hint_key' => 'commerce.payments.paypal.client_id',
                'docs' => 'https://developer.paypal.com/dashboard/applications',
                'mode' => config('commerce.payments.paypal.mode') === 'live' ? 'live' : 'sandbox',
            ],
            'stripe' => [
                'label' => 'Stripe',
                'description' => 'Cards and wallets through Stripe Checkout.',
                'keys' => ['STRIPE_KEY' => 'commerce.payments.stripe.key', 'STRIPE_SECRET' => 'commerce.payments.stripe.secret', 'STRIPE_WEBHOOK_SECRET' => 'commerce.payments.stripe.webhook_secret'],
                'required' => ['STRIPE_KEY', 'STRIPE_SECRET'],
                'hint_key' => 'commerce.payments.stripe.key',
                'docs' => 'https://dashboard.stripe.com/apikeys',
                'mode' => str_starts_with((string) config('commerce.payments.stripe.secret'), 'sk_live') ? 'live' : 'test',
            ],
        ];

        $payments = [];

        foreach ($gateways as $id => $gateway) {
            $present = collect($gateway['keys'])->map(fn (string $path) => filled(config($path)));
            $missing = collect($gateway['required'])->filter(fn (string $env) => ! $present[$env])->values()->all();
            $hint = (string) config($gateway['hint_key']);

            $payments[] = [
                'id' => $id,
                'label' => $gateway['label'],
                'description' => $gateway['description'],
                'configured' => $missing === [],
                'mode' => $gateway['mode'],
                'missing' => $missing,
                'webhook_secret_set' => (bool) $present[array_key_last($gateway['keys'])],
                'key_hint' => $hint !== '' ? '••••'.substr($hint, -4) : null,
                'webhook_url' => url("/api/commerce/payments/webhooks/{$id}"),
                'docs_url' => $gateway['docs'],
                'env' => array_keys($gateway['keys']),
            ];
        }

        $payments[] = [
            'id' => 'cod',
            'label' => 'Cash on delivery',
            'description' => 'Pay when the order arrives.',
            'configured' => (bool) config('commerce.cod.enabled', true),
            'mode' => 'live',
            'missing' => [],
            'webhook_secret_set' => true,
            'key_hint' => null,
            'webhook_url' => null,
            'docs_url' => null,
            'env' => ['COMMERCE_COD_ENABLED', 'COMMERCE_COD_MIN', 'COMMERCE_COD_MAX'],
        ];

        return response()->json(['data' => [
            'currency' => config('commerce.currency'),
            'payments' => $payments,
            'using_test_gateway' => collect($payments)->where('configured', true)->whereIn('id', ['razorpay', 'paypal', 'stripe'])->isEmpty(),
            'whatsapp' => [
                'click_to_chat' => true,
                'business_number' => $whatsapp->normalizePhone(config('services.whatsapp.business_number')),
                'api_configured' => $whatsapp->configured(),
                'auto_notify' => (bool) config('services.whatsapp.auto_notify'),
                'missing' => collect(['WHATSAPP_TOKEN' => 'token', 'WHATSAPP_PHONE_NUMBER_ID' => 'phone_number_id'])
                    ->filter(fn (string $key) => blank(config("services.whatsapp.{$key}")))->keys()->values()->all(),
            ],
            'assistant' => ['enabled' => true, 'engine' => 'built-in'],
        ]]);
    }
}
