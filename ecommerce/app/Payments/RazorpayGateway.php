<?php

namespace App\Payments;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Webfolks\CommerceCore\Contracts\PaymentGateway;
use Webfolks\CommerceCore\Models\Order;
use Webfolks\CommerceCore\Payments\PaymentResult;
use Webfolks\CommerceCore\Support\Money;

class RazorpayGateway implements PaymentGateway
{
    use ConfirmsOrderAmount;

    /**
     * @param  array<string, mixed>  $paymentData
     */
    public function charge(Order $order, array $paymentData): PaymentResult
    {
        $keyId = config('commerce.payments.razorpay.key_id');
        $secret = config('commerce.payments.razorpay.key_secret');

        if (! is_string($keyId) || $keyId === '' || ! is_string($secret) || $secret === '') {
            return $this->notConfigured();
        }

        $response = Http::withBasicAuth($keyId, $secret)
            ->acceptJson()
            ->timeout(15)
            ->post('https://api.razorpay.com/v1/orders', [
                'amount' => Money::toCents((string) $order->total),
                'currency' => strtoupper((string) $order->currency),
                'receipt' => $order->number,
                'notes' => [
                    'order_number' => $order->number,
                    'order_id' => (string) $order->id,
                ],
            ]);

        $razorpayOrderId = $response->json('id');

        if (! $response->successful() || ! is_string($razorpayOrderId) || $razorpayOrderId === '') {
            return PaymentResult::failed(
                $response->json('error.description') ?? 'Unable to start Razorpay checkout.',
                is_string($razorpayOrderId) ? $razorpayOrderId : null,
                $this->name(),
            );
        }

        return PaymentResult::pendingCapture($razorpayOrderId, $this->name(), [
            'gateway' => $this->name(),
            'mode' => 'sdk',
            'key' => $keyId,
            'order_id' => $razorpayOrderId,
            'amount' => Money::toCents((string) $order->total),
            'currency' => strtoupper((string) $order->currency),
            'name' => config('app.name'),
            'description' => 'Order '.$order->number,
            'prefill' => [
                'name' => $order->shipping_address['name'] ?? '',
            ],
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function confirm(Order $order, array $payload): PaymentResult
    {
        $secret = config('commerce.payments.razorpay.key_secret');
        $paymentId = $payload['razorpay_payment_id'] ?? null;
        $razorpayOrderId = $payload['razorpay_order_id'] ?? null;
        $signature = $payload['razorpay_signature'] ?? null;

        if (! is_string($secret) || $secret === '' || ! is_string($paymentId) || ! is_string($razorpayOrderId) || ! is_string($signature)) {
            return PaymentResult::failed('Razorpay confirmation is incomplete.', null, $this->name());
        }

        if ($order->payment_reference !== $razorpayOrderId) {
            return PaymentResult::failed('Razorpay order does not match this checkout.', $razorpayOrderId, $this->name());
        }

        $expected = hash_hmac('sha256', $razorpayOrderId.'|'.$paymentId, $secret);

        if (! hash_equals($expected, $signature)) {
            return PaymentResult::failed('Razorpay signature verification failed.', $paymentId, $this->name());
        }

        $keyId = config('commerce.payments.razorpay.key_id');

        if (! is_string($keyId) || $keyId === '') {
            return $this->notConfigured();
        }

        $payment = Http::withBasicAuth($keyId, $secret)
            ->acceptJson()
            ->timeout(15)
            ->get('https://api.razorpay.com/v1/payments/'.$paymentId);

        $status = $payment->json('status');
        $amount = $payment->json('amount');

        if (! $payment->successful() || ! in_array($status, ['captured', 'authorized'], true)) {
            return PaymentResult::failed(
                $payment->json('error.description') ?? 'Razorpay payment was not captured.',
                $paymentId,
                $this->name(),
            );
        }

        if (! is_numeric($amount) || ! $this->amountsMatch($order, (int) $amount)) {
            return PaymentResult::failed('Razorpay amount does not match the order total.', $paymentId, $this->name());
        }

        return PaymentResult::ok($paymentId, $this->name());
    }

    public function refund(Order $order, ?string $amount = null): PaymentResult
    {
        $keyId = config('commerce.payments.razorpay.key_id');
        $secret = config('commerce.payments.razorpay.key_secret');

        if (! is_string($keyId) || $keyId === '' || ! is_string($secret) || $secret === '') {
            return $this->notConfigured();
        }

        if (! is_string($order->payment_reference) || $order->payment_reference === '') {
            return PaymentResult::failed('The order has no Razorpay payment to refund.', null, $this->name());
        }

        $payload = [];

        if (is_string($amount) && $amount !== '') {
            $payload['amount'] = Money::toCents($amount);
        }

        $paymentId = str_starts_with($order->payment_reference, 'pay_')
            ? $order->payment_reference
            : null;

        if ($paymentId === null) {
            return PaymentResult::failed('Razorpay refunds require a captured payment id.', $order->payment_reference, $this->name());
        }

        $response = Http::withBasicAuth($keyId, $secret)
            ->acceptJson()
            ->timeout(15)
            ->post('https://api.razorpay.com/v1/payments/'.$paymentId.'/refund', $payload);

        if ($response->successful()) {
            return PaymentResult::ok($response->json('id'), $this->name());
        }

        return PaymentResult::failed(
            $response->json('error.description') ?? 'Razorpay refund failed.',
            $response->json('id'),
            $this->name(),
        );
    }

    public function verifyWebhook(Request $request): bool
    {
        $secret = config('commerce.payments.razorpay.webhook_secret');
        $header = $request->header('X-Razorpay-Signature');

        if (! is_string($secret) || $secret === '' || ! is_string($header) || $header === '') {
            return false;
        }

        $expected = hash_hmac('sha256', $request->getContent(), $secret);

        return hash_equals($expected, $header);
    }

    public function name(): string
    {
        return 'razorpay';
    }
}
