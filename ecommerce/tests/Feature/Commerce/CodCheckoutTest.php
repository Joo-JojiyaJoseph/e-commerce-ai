<?php

use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Webfolks\CommerceCore\Enums\OrderStatus;
use Webfolks\CommerceCore\Enums\PaymentStatus;
use Webfolks\CommerceCore\Models\Product;
use Webfolks\CommerceCore\Models\ProductVariant;

test('places a cash on delivery order with pending payment', function () {
    $user = User::factory()->create();
    $variant = ProductVariant::factory()
        ->for(Product::factory())
        ->create(['price' => '22.00', 'stock' => 9]);

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
        'payment' => ['method' => 'cod'],
    ])->assertCreated()
        ->assertJsonPath('data.status', OrderStatus::Confirmed->value)
        ->assertJsonPath('data.payment_status', PaymentStatus::Pending->value)
        ->assertJsonPath('data.payment_gateway', 'cod');

    expect($variant->refresh()->stock)->toBe(8);
});
