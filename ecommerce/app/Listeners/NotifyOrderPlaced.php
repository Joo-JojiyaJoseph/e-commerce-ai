<?php

namespace App\Listeners;

use App\Models\User;
use App\Services\NotificationService;
use Webfolks\CommerceCore\Enums\PaymentStatus;
use Webfolks\CommerceCore\Events\OrderPlaced;

class NotifyOrderPlaced
{
    public function __construct(protected NotificationService $notifications) {}

    public function handle(OrderPlaced $event): void
    {
        $order = $event->order;
        $user = User::query()->find($order->user_id);

        if (! $user) {
            return;
        }

        $cod = $order->payment_gateway === 'cod' || $order->payment_status === PaymentStatus::Pending;

        $this->notifications->send(
            $user,
            'order.placed',
            'Order placed',
            $cod
                ? "Order {$order->number} was placed. Pay cash on delivery."
                : "Order {$order->number} was placed.",
            '/account/orders/'.$order->number,
            ['order_id' => $order->id, 'order_number' => $order->number],
        );
    }
}
