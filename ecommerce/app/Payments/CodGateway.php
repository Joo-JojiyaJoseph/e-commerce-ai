<?php

namespace App\Payments;

use Illuminate\Http\Request;
use Webfolks\CommerceCore\Contracts\PaymentGateway;
use Webfolks\CommerceCore\Models\Order;
use Webfolks\CommerceCore\Payments\PaymentResult;

class CodGateway implements PaymentGateway
{
    /**
     * @param  array<string, mixed>  $paymentData
     */
    public function charge(Order $order, array $paymentData): PaymentResult
    {
        if (! config('commerce.cod.enabled', true)) {
            return PaymentResult::failed('Cash on delivery is not available.', null, $this->name());
        }

        $min = config('commerce.cod.min_order');
        $max = config('commerce.cod.max_order');
        $total = (float) $order->total;

        if (is_numeric($min) && $total < (float) $min) {
            return PaymentResult::failed('This order is below the cash on delivery minimum.', null, $this->name());
        }

        if (is_numeric($max) && $total > (float) $max) {
            return PaymentResult::failed('This order exceeds the cash on delivery maximum.', null, $this->name());
        }

        return PaymentResult::pendingCapture('cod_'.$order->number, $this->name());
    }

    public function refund(Order $order, ?string $amount = null): PaymentResult
    {
        return PaymentResult::ok('cod_void_'.$order->number, $this->name());
    }

    public function verifyWebhook(Request $request): bool
    {
        return false;
    }

    public function name(): string
    {
        return 'cod';
    }
}
