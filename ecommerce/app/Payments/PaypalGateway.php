<?php

namespace App\Payments;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Webfolks\CommerceCore\Contracts\PaymentGateway;
use Webfolks\CommerceCore\Models\Order;
use Webfolks\CommerceCore\Payments\PaymentResult;

class PaypalGateway implements PaymentGateway
{
    use ConfirmsOrderAmount;

    /**
     * @param  array<string, mixed>  $paymentData
     */
    public function charge(Order $order, array $paymentData): PaymentResult
    {
        $token = $this->accessToken();

        if ($token === null) {
            return $this->notConfigured();
        }

        $response = Http::withToken($token)
            ->acceptJson()
            ->timeout(20)
            ->post($this->baseUrl().'/v2/checkout/orders', [
                'intent' => 'CAPTURE',
                'purchase_units' => [[
                    'reference_id' => $order->number,
                    'custom_id' => (string) $order->id,
                    'amount' => [
                        'currency_code' => strtoupper((string) $order->currency),
                        'value' => $order->total,
                    ],
                ]],
                'payment_source' => [
                    'paypal' => [
                        'experience_context' => [
                            'brand_name' => config('app.name'),
                            'landing_page' => 'NO_PREFERENCE',
                            'user_action' => 'PAY_NOW',
                            'return_url' => $this->frontendUrl('/orders/'.$order->number).'?gateway=paypal',
                            'cancel_url' => $this->frontendUrl('/checkout').'?cancelled=1',
                        ],
                    ],
                ],
            ]);

        $paypalOrderId = $response->json('id');
        $links = $response->json('links');
        $url = null;

        if (is_array($links)) {
            foreach ($links as $link) {
                if (is_array($link) && in_array($link['rel'] ?? null, ['payer-action', 'approve'], true) && is_string($link['href'] ?? null)) {
                    $url = $link['href'];
                    break;
                }
            }
        }

        if (! $response->successful() || ! is_string($paypalOrderId) || ! is_string($url)) {
            return PaymentResult::failed(
                $response->json('message') ?? 'Unable to start PayPal checkout.',
                is_string($paypalOrderId) ? $paypalOrderId : null,
                $this->name(),
            );
        }

        return PaymentResult::pendingCapture($paypalOrderId, $this->name(), [
            'gateway' => $this->name(),
            'mode' => 'redirect',
            'checkout_url' => $url,
            'paypal_order_id' => $paypalOrderId,
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function confirm(Order $order, array $payload): PaymentResult
    {
        $token = $this->accessToken();
        $paypalOrderId = $payload['paypal_order_id'] ?? $payload['token'] ?? $order->payment_reference;

        if ($token === null || ! is_string($paypalOrderId) || $paypalOrderId === '') {
            return PaymentResult::failed('PayPal confirmation is incomplete.', null, $this->name());
        }

        if ($order->payment_reference !== $paypalOrderId) {
            return PaymentResult::failed('PayPal order does not match this checkout.', $paypalOrderId, $this->name());
        }

        $response = Http::withToken($token)
            ->acceptJson()
            ->timeout(20)
            ->withHeaders(['PayPal-Request-Id' => 'capture-'.$order->number])
            ->post($this->baseUrl().'/v2/checkout/orders/'.$paypalOrderId.'/capture');

        $status = $response->json('status');

        if ($response->status() === 422 && $response->json('details.0.issue') === 'ORDER_ALREADY_CAPTURED') {
            return PaymentResult::ok($paypalOrderId, $this->name());
        }

        if (! $response->successful() || $status !== 'COMPLETED') {
            return PaymentResult::failed(
                $response->json('message') ?? 'PayPal capture failed.',
                $paypalOrderId,
                $this->name(),
            );
        }

        $captured = $response->json('purchase_units.0.payments.captures.0.amount.value');
        $reference = $response->json('purchase_units.0.reference_id');

        if (is_string($reference) && $reference !== $order->number) {
            return PaymentResult::failed('PayPal capture does not belong to this order.', $paypalOrderId, $this->name());
        }

        if (! is_string($captured) || ! $this->majorAmountsMatch($order, $captured)) {
            return PaymentResult::failed('PayPal amount does not match the order total.', $paypalOrderId, $this->name());
        }

        $captureId = $response->json('purchase_units.0.payments.captures.0.id');

        return PaymentResult::ok(is_string($captureId) ? $captureId : $paypalOrderId, $this->name());
    }

    public function refund(Order $order, ?string $amount = null): PaymentResult
    {
        $token = $this->accessToken();

        if ($token === null || ! is_string($order->payment_reference) || $order->payment_reference === '') {
            return PaymentResult::failed('PayPal refund is unavailable.', null, $this->name());
        }

        $payload = [];

        if (is_string($amount) && $amount !== '') {
            $payload['amount'] = [
                'currency_code' => strtoupper((string) $order->currency),
                'value' => $amount,
            ];
        }

        $response = Http::withToken($token)
            ->acceptJson()
            ->timeout(20)
            ->post($this->baseUrl().'/v2/payments/captures/'.$order->payment_reference.'/refund', $payload);

        if ($response->successful()) {
            return PaymentResult::ok($response->json('id'), $this->name());
        }

        return PaymentResult::failed($response->json('message') ?? 'PayPal refund failed.', $response->json('id'), $this->name());
    }

    public function verifyWebhook(Request $request): bool
    {
        $token = $this->accessToken();
        $webhookId = config('commerce.payments.paypal.webhook_id');

        if ($token === null || ! is_string($webhookId) || $webhookId === '') {
            return false;
        }

        $response = Http::withToken($token)
            ->acceptJson()
            ->timeout(15)
            ->post($this->baseUrl().'/v1/notifications/verify-webhook-signature', [
                'auth_algo' => $request->header('PAYPAL-AUTH-ALGO'),
                'cert_url' => $request->header('PAYPAL-CERT-URL'),
                'transmission_id' => $request->header('PAYPAL-TRANSMISSION-ID'),
                'transmission_sig' => $request->header('PAYPAL-TRANSMISSION-SIG'),
                'transmission_time' => $request->header('PAYPAL-TRANSMISSION-TIME'),
                'webhook_id' => $webhookId,
                'webhook_event' => $request->all(),
            ]);

        return $response->successful() && $response->json('verification_status') === 'SUCCESS';
    }

    public function name(): string
    {
        return 'paypal';
    }

    protected function accessToken(): ?string
    {
        $id = config('commerce.payments.paypal.client_id');
        $secret = config('commerce.payments.paypal.client_secret');

        if (! is_string($id) || $id === '' || ! is_string($secret) || $secret === '') {
            return null;
        }

        $cacheKey = 'commerce.paypal.token.'.$id;

        $cached = Cache::get($cacheKey);

        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        $response = Http::withBasicAuth($id, $secret)
            ->asForm()
            ->acceptJson()
            ->timeout(15)
            ->post($this->baseUrl().'/v1/oauth2/token', [
                'grant_type' => 'client_credentials',
            ]);

        $token = $response->json('access_token');
        $expires = (int) $response->json('expires_in', 300);

        if (! $response->successful() || ! is_string($token) || $token === '') {
            return null;
        }

        Cache::put($cacheKey, $token, max(30, $expires - 60));

        return $token;
    }

    protected function baseUrl(): string
    {
        return config('commerce.payments.paypal.mode') === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
    }
}
