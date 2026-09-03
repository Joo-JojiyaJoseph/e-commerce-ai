<?php

namespace App\Listeners;

use App\Models\User;
use App\Services\NotificationService;
use Webfolks\CommerceCore\Events\PaymentCompleted;

class NotifyPaymentCompleted
{
    public function __construct(protected NotificationService $notifications) {}

    public function handle(PaymentCompleted $event): void
    {
        $order = $event->order;
        $user = User::query()->find($order->user_id);

        if (! $user) {
            return;
        }

        $this->notifications->send(
            $user,
            'payment.successful',
            'Payment successful',
            "Payment for order {$order->number} was confirmed.",
            '/account/orders/'.$order->number,
            ['order_id' => $order->id, 'order_number' => $order->number],
        );
    }
}
