<?php

namespace App\Payments;

use Webfolks\CommerceCore\Models\Order;
use Webfolks\CommerceCore\Payments\PaymentResult;
use Webfolks\CommerceCore\Support\Money;

trait ConfirmsOrderAmount
{
    protected function amountsMatch(Order $order, int $amountInMinorUnits): bool
    {
        return $amountInMinorUnits === Money::toCents((string) $order->total);
    }

    protected function majorAmountsMatch(Order $order, string $amount): bool
    {
        return Money::of($amount) === Money::of($order->total);
    }

    protected function frontendUrl(string $path = ''): string
    {
        return rtrim((string) config('app.frontend_url'), '/').$path;
    }

    protected function notConfigured(): PaymentResult
    {
        return PaymentResult::failed(ucfirst($this->name()).' is not configured.', null, $this->name());
    }
}
