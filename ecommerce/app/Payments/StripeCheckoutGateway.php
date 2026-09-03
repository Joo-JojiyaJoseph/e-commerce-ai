<?php

namespace App\Payments;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Webfolks\CommerceCore\Contracts\PaymentGateway;
use Webfolks\CommerceCore\Models\Order;
use Webfolks\CommerceCore\Payments\PaymentResult;
use Webfolks\CommerceCore\Payments\StripeGateway as PackageStripeGateway;
use Webfolks\CommerceCore\Support\Money;

class StripeCheckoutGateway implements PaymentGateway
{
    use ConfirmsOrderAmount;

    public function __construct(protected PackageStripeGateway $cards) {}

    /**
     * @param  array<string, mixed>  $paymentData
     */
    public function charge(Order $order, array $paymentData): PaymentResult
    {
        if (isset($paymentData['payment_method']) && is_string($paymentData['payment_method']) && $paymentData['payment_method'] !== '') {
            $result = $this->cards->charge($order, $paymentData);

            return new PaymentResult(
                $result->success,
                $result->reference,
                $result->message,
                $result->captured,
                $this->name(),
                $result->clientPayload,
            );
        }

        $secret = config('commerce.payments.stripe.secret');

        if (! is_string($secret) || $secret === '') {
            return $this->notConfigured();
        }

        $success = $this->frontendUrl('/orders/'.$order->number).'?gateway=stripe&session_id={CHECKOUT_SESSION_ID}';
        $cancel = $this->frontendUrl('/checkout').'?cancelled=1';

        $response = Http::withToken($secret)
            ->asForm()
            ->acceptJson()
            ->timeout(15)
            ->post('https://api.stripe.com/v1/checkout/sessions', [
                'mode' => 'payment',
                'success_url' => $success,
                'cancel_url' => $cancel,
                'client_reference_id' => $order->number,
                'metadata[order_id]' => (string) $order->id,
                'metadata[order_number]' => $order->number,
                'line_items[0][quantity]' => 1,
                'line_items[0][price_data][currency]' => strtolower((string) $order->currency),
                'line_items[0][price_data][unit_amount]' => Money::toCents((string) $order->total),
                'line_items[0][price_data][product_data][name]' => 'Order '.$order->number,
            ]);

        $sessionId = $response->json('id');
        $url = $response->json('url');

        if (! $response->successful() || ! is_string($sessionId) || ! is_string($url)) {
            return PaymentResult::failed(
                $response->json('error.message') ?? 'Unable to start Stripe checkout.',
                is_string($sessionId) ? $sessionId : null,
                $this->name(),
            );
        }

        return PaymentResult::pendingCapture($sessionId, $this->name(), [
            'gateway' => $this->name(),
            'mode' => 'redirect',
            'checkout_url' => $url,
            'session_id' => $sessionId,
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function confirm(Order $order, array $payload): PaymentResult
    {
        $secret = config('commerce.payments.stripe.secret');
        $sessionId = $payload['session_id'] ?? $order->payment_reference;

        if (! is_string($secret) || $secret === '' || ! is_string($sessionId) || $sessionId === '') {
            return PaymentResult::failed('Stripe confirmation is incomplete.', null, $this->name());
        }

        $response = Http::withToken($secret)
            ->acceptJson()
            ->timeout(15)
            ->get('https://api.stripe.com/v1/checkout/sessions/'.$sessionId);

        if (! $response->successful()) {
            return PaymentResult::failed(
                $response->json('error.message') ?? 'Stripe session could not be retrieved.',
                $sessionId,
                $this->name(),
            );
        }

        $paymentStatus = $response->json('payment_status');
        $reference = $response->json('client_reference_id');
        $amount = $response->json('amount_total');
        $paymentIntent = $response->json('payment_intent');

        if ($paymentStatus !== 'paid') {
            return PaymentResult::failed('Stripe payment has not been completed.', $sessionId, $this->name());
        }

        if ($reference !== $order->number) {
            return PaymentResult::failed('Stripe session does not belong to this order.', $sessionId, $this->name());
        }

        if (! is_numeric($amount) || ! $this->amountsMatch($order, (int) $amount)) {
            return PaymentResult::failed('Stripe amount does not match the order total.', $sessionId, $this->name());
        }

        return PaymentResult::ok(is_string($paymentIntent) ? $paymentIntent : $sessionId, $this->name());
    }

    public function refund(Order $order, ?string $amount = null): PaymentResult
    {
        $result = $this->cards->refund($order, $amount);

        return new PaymentResult(
            $result->success,
            $result->reference,
            $result->message,
            $result->captured,
            $this->name(),
            $result->clientPayload,
        );
    }

    public function verifyWebhook(Request $request): bool
    {
        return $this->cards->verifyWebhook($request);
    }

    public function name(): string
    {
        return 'stripe';
    }
}
