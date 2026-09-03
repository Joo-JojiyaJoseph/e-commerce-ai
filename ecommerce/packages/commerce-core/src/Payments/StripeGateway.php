<?php

namespace Webfolks\CommerceCore\Payments;

use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Webfolks\CommerceCore\Contracts\PaymentGateway;
use Webfolks\CommerceCore\Models\Order;
use Webfolks\CommerceCore\Support\Money;

class StripeGateway implements PaymentGateway
{
    public function charge(Order $order, array $paymentData): PaymentResult
    {
        $secret = config('commerce.payments.stripe.secret');

        if (! is_string($secret) || $secret === '') {
            return PaymentResult::failed('Stripe is not configured.');
        }

        $payload = [
            'amount' => Money::toCents((string) $order->total),
            'currency' => strtolower((string) $order->currency),
            'confirm' => 'true',
            'automatic_payment_methods[enabled]' => 'true',
            'automatic_payment_methods[allow_redirects]' => 'never',
            'metadata[order_id]' => (string) $order->id,
            'metadata[order_number]' => (string) $order->number,
        ];

        if (isset($paymentData['payment_method']) && is_string($paymentData['payment_method'])) {
            $payload['payment_method'] = $paymentData['payment_method'];
        }

        $response = Http::withToken($secret)
            ->asForm()
            ->acceptJson()
            ->timeout(15)
            ->retry(2, 200)
            ->post('https://api.stripe.com/v1/payment_intents', $payload);

        return $this->resultFromIntent($response);
    }

    public function refund(Order $order, ?string $amount = null): PaymentResult
    {
        $secret = config('commerce.payments.stripe.secret');

        if (! is_string($secret) || $secret === '') {
            return PaymentResult::failed('Stripe is not configured.');
        }

        if (! is_string($order->payment_reference) || $order->payment_reference === '') {
            return PaymentResult::failed('The order has no payment reference to refund.');
        }

        $payload = [
            'payment_intent' => $order->payment_reference,
        ];

        if (is_string($amount) && $amount !== '') {
            $payload['amount'] = Money::toCents($amount);
        }

        $response = Http::withToken($secret)
            ->asForm()
            ->acceptJson()
            ->timeout(15)
            ->retry(2, 200)
            ->post('https://api.stripe.com/v1/refunds', $payload);

        if ($response->successful()) {
            return PaymentResult::ok($response->json('id'));
        }

        return PaymentResult::failed(
            $response->json('error.message') ?? 'Stripe refund failed.',
            $response->json('id'),
        );
    }

    public function verifyWebhook(Request $request): bool
    {
        $secret = config('commerce.payments.stripe.webhook_secret');
        $header = $request->header('Stripe-Signature');

        if (! is_string($secret) || $secret === '' || ! is_string($header) || $header === '') {
            return false;
        }

        $timestamp = null;
        $signature = null;

        foreach (explode(',', $header) as $part) {
            [$key, $value] = array_pad(explode('=', trim($part), 2), 2, null);

            if ($key === 't') {
                $timestamp = $value;
            }

            if ($key === 'v1') {
                $signature = $value;
            }
        }

        if (! is_string($timestamp) || ! is_string($signature)) {
            return false;
        }

        $signedPayload = $timestamp.'.'.$request->getContent();
        $expected = hash_hmac('sha256', $signedPayload, $secret);

        return hash_equals($expected, $signature);
    }

    public function name(): string
    {
        return 'stripe';
    }

    protected function resultFromIntent(Response $response): PaymentResult
    {
        $status = $response->json('status');
        $id = $response->json('id');

        if ($response->successful() && in_array($status, ['succeeded', 'requires_capture'], true)) {
            return PaymentResult::ok(is_string($id) ? $id : null);
        }

        return PaymentResult::failed(
            $response->json('error.message') ?? 'Stripe charge failed.',
            is_string($id) ? $id : null,
        );
    }
}
