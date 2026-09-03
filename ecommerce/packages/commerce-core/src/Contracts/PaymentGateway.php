<?php

namespace Webfolks\CommerceCore\Contracts;

use Illuminate\Http\Request;
use Webfolks\CommerceCore\Models\Order;
use Webfolks\CommerceCore\Payments\PaymentResult;

interface PaymentGateway
{
    public function charge(Order $order, array $paymentData): PaymentResult;

    public function refund(Order $order, ?string $amount = null): PaymentResult;

    public function verifyWebhook(Request $request): bool;

    public function name(): string;
}
