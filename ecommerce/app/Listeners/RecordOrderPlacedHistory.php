<?php

namespace App\Listeners;

use App\Models\OrderStatusHistory;
use Webfolks\CommerceCore\Events\OrderPlaced;

class RecordOrderPlacedHistory
{
    public function handle(OrderPlaced $event): void
    {
        OrderStatusHistory::query()->create([
            'order_id' => $event->order->id,
            'status' => $event->order->status->value,
            'payment_status' => $event->order->payment_status->value,
            'note' => 'Order placed',
            'created_at' => now(),
        ]);
    }
}
