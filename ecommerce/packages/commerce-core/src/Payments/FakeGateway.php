<?php

namespace Webfolks\CommerceCore\Payments;

use Illuminate\Http\Request;
use Webfolks\CommerceCore\Contracts\PaymentGateway;
use Webfolks\CommerceCore\Models\Order;

class FakeGateway implements PaymentGateway
{
    public function charge(Order $order, array $paymentData): PaymentResult
    {
        if (($paymentData['fail'] ?? false) === true) {
            return PaymentResult::failed('The payment was declined.');
        }

        return PaymentResult::ok('fake_'.$order->number);
    }

    public function refund(Order $order, ?string $amount = null): PaymentResult
    {
        return PaymentResult::ok('fake_refund_'.$order->number);
    }

    public function verifyWebhook(Request $request): bool
    {
        return $request->boolean('valid');
    }

    public function name(): string
    {
        return 'fake';
    }
}
