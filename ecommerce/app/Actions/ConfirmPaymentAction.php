<?php

namespace App\Actions;

use App\Payments\PaypalGateway;
use App\Payments\RazorpayGateway;
use App\Payments\StripeCheckoutGateway;
use Illuminate\Validation\ValidationException;
use Webfolks\CommerceCore\Enums\PaymentStatus;
use Webfolks\CommerceCore\Events\PaymentCompleted;
use Webfolks\CommerceCore\Models\Order;
use Webfolks\CommerceCore\Payments\PaymentResult;

class ConfirmPaymentAction
{
    public function __construct(
        protected RazorpayGateway $razorpay,
        protected StripeCheckoutGateway $stripe,
        protected PaypalGateway $paypal,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public function execute(Order $order, array $payload = []): Order
    {
        if ($order->payment_status === PaymentStatus::Completed) {
            return $order->loadMissing('items');
        }

        if ($order->payment_status === PaymentStatus::Failed) {
            throw ValidationException::withMessages([
                'payment' => 'This order can no longer be paid.',
            ]);
        }

        $result = $this->confirm($order, $payload);

        if (! $result->successful() || ! $result->captured()) {
            throw ValidationException::withMessages([
                'payment' => $result->message() !== '' ? $result->message() : 'Payment could not be verified.',
            ]);
        }

        $order->markAsPaid($result->reference, $order->payment_gateway);
        event(new PaymentCompleted($order->refresh()));

        return $order->refresh()->load('items');
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    protected function confirm(Order $order, array $payload): PaymentResult
    {
        return match ($order->payment_gateway) {
            'razorpay' => $this->razorpay->confirm($order, $payload),
            'stripe' => $this->stripe->confirm($order, $payload),
            'paypal' => $this->paypal->confirm($order, $payload),
            default => PaymentResult::failed('This order does not require hosted payment confirmation.'),
        };
    }
}
