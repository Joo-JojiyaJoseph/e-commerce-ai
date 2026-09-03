<?php

use App\Models\StoreNotification;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Webfolks\CommerceCore\Models\Product;
use Webfolks\CommerceCore\Models\ProductVariant;

test('returns an unread notification count without listing every notification', function () {
    $user = User::factory()->create();

    StoreNotification::query()->create([
        'user_id' => $user->id,
        'type' => 'order.placed',
        'title' => 'Order placed',
        'message' => 'Order ORD-1 was placed.',
        'action_url' => '/account/orders/ORD-1',
        'is_read' => false,
    ]);

    StoreNotification::query()->create([
        'user_id' => $user->id,
        'type' => 'order.placed',
        'title' => 'Older',
        'message' => 'Read already.',
        'is_read' => true,
        'read_at' => now(),
    ]);

    Sanctum::actingAs($user);

    $this->getJson('/api/notifications/unread-count')
        ->assertOk()
        ->assertJsonPath('data.count', 1);
});

test('prevents a customer from reading another customer notification', function () {
    $owner = User::factory()->create();
    $intruder = User::factory()->create();

    $notification = StoreNotification::query()->create([
        'user_id' => $owner->id,
        'type' => 'order.placed',
        'title' => 'Order placed',
        'message' => 'Private.',
        'is_read' => false,
    ]);

    Sanctum::actingAs($intruder);

    $this->postJson("/api/notifications/{$notification->id}/read")->assertForbidden();
    $this->deleteJson("/api/notifications/{$notification->id}")->assertForbidden();
});

test('creates a notification when an authenticated customer places an order', function () {
    $user = User::factory()->create();
    $variant = ProductVariant::factory()
        ->for(Product::factory())
        ->create(['price' => '22.00', 'stock' => 4]);

    Sanctum::actingAs($user);

    $this->postJson('/api/commerce/cart/items', [
        'variant_id' => $variant->id,
        'quantity' => 1,
    ])->assertSuccessful();

    $this->postJson('/api/commerce/checkout', [
        'shipping_address' => [
            'name' => 'Casey Buyer',
            'phone' => '2065550100',
            'line1' => '88 Harbor Ave',
            'city' => 'Seattle',
            'postal_code' => '98101',
            'country' => 'US',
        ],
    ])->assertCreated();

    $this->getJson('/api/notifications')
        ->assertOk()
        ->assertJsonPath('data.0.type', 'payment.successful');
});

test('clears only the current user read notifications', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    $unread = StoreNotification::query()->create([
        'user_id' => $user->id,
        'type' => 'order.placed',
        'title' => 'Unread order',
        'message' => 'Keep this.',
        'is_read' => false,
    ]);

    StoreNotification::query()->create([
        'user_id' => $user->id,
        'type' => 'payment.successful',
        'title' => 'Read payment',
        'message' => 'Remove this.',
        'is_read' => true,
        'read_at' => now(),
    ]);

    $otherRead = StoreNotification::query()->create([
        'user_id' => $other->id,
        'type' => 'offer.published',
        'title' => 'Other user',
        'message' => 'Leave this.',
        'is_read' => true,
        'read_at' => now(),
    ]);

    Sanctum::actingAs($user);

    $this->postJson('/api/notifications/clear-read')
        ->assertOk()
        ->assertJsonPath('data.deleted', 1);

    expect(StoreNotification::query()->find($unread->id))->not->toBeNull();
    expect(StoreNotification::query()->where('user_id', $user->id)->where('is_read', true)->exists())->toBeFalse();
    expect(StoreNotification::query()->find($otherRead->id))->not->toBeNull();
});

test('can list only unread notifications', function () {
    $user = User::factory()->create();

    StoreNotification::query()->create([
        'user_id' => $user->id,
        'type' => 'order.placed',
        'title' => 'Unread order',
        'message' => 'New.',
        'is_read' => false,
    ]);

    StoreNotification::query()->create([
        'user_id' => $user->id,
        'type' => 'payment.successful',
        'title' => 'Read payment',
        'message' => 'Old.',
        'is_read' => true,
        'read_at' => now(),
    ]);

    Sanctum::actingAs($user);

    $this->getJson('/api/notifications?unread=1')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Unread order');
});
