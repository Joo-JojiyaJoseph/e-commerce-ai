<?php

namespace App\Payments;

use Illuminate\Http\Request;
use Webfolks\CommerceCore\Contracts\PaymentGateway;
use Webfolks\CommerceCore\Models\Order;
use Webfolks\CommerceCore\Payments\PaymentResult;

class RoutingGateway implements PaymentGateway
{
    public function __construct(
        protected PaymentGateway $online,
        protected CodGateway $cod,
        protected RazorpayGateway $razorpay,
        protected PaypalGateway $paypal,
        protected StripeCheckoutGateway $stripe,
    ) {}

    /**
     * @param  array<string, mixed>  $paymentData
     */
    public function charge(Order $order, array $paymentData): PaymentResult
    {
        return $this->resolve($paymentData['method'] ?? 'online')->charge($order, $paymentData);
    }

    public function refund(Order $order, ?string $amount = null): PaymentResult
    {
        return $this->byName($order->payment_gateway)->refund($order, $amount);
    }

    public function verifyWebhook(Request $request): bool
    {
        return $this->stripe->verifyWebhook($request);
    }

    public function name(): string
    {
        return $this->online->name();
    }

    public function byName(?string $name): PaymentGateway
    {
        return match ($name) {
            'cod' => $this->cod,
            'razorpay' => $this->razorpay,
            'paypal' => $this->paypal,
            'stripe' => $this->stripe,
            default => $this->online,
        };
    }

    public function resolve(mixed $method): PaymentGateway
    {
        return $this->byName(is_string($method) ? $method : 'online');
    }
}
