<?php

namespace App\Services;

use App\Models\NotificationPreference;
use App\Models\StoreNotification;
use App\Models\User;

class NotificationService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function send(User $user, string $type, string $title, string $message, ?string $actionUrl = null, array $data = []): ?StoreNotification
    {
        $channel = $this->channelFor($type);
        $preferences = NotificationPreference::query()->firstOrCreate(
            ['user_id' => $user->id],
            ['orders' => true, 'payments' => true, 'reviews' => true, 'offers' => true, 'security' => true],
        );

        if ($channel === 'offers' && ! $preferences->offers) {
            return null;
        }

        return StoreNotification::query()->create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'action_url' => $actionUrl,
            'data' => $data,
        ]);
    }

    protected function channelFor(string $type): string
    {
        return match (true) {
            str_starts_with($type, 'order.') || str_starts_with($type, 'shipping.') => 'orders',
            str_starts_with($type, 'payment.') || str_starts_with($type, 'refund.') => 'payments',
            str_starts_with($type, 'review.') => 'reviews',
            str_starts_with($type, 'offer.') || str_starts_with($type, 'coupon.') => 'offers',
            default => 'security',
        };
    }
}
