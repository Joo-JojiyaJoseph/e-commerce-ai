<?php

use Webfolks\CommerceCore\Actions\AddToCartAction;
use Webfolks\CommerceCore\Actions\CancelOrderAction;
use Webfolks\CommerceCore\Actions\PlaceOrderAction;
use Webfolks\CommerceCore\Enums\OrderStatus;
use Webfolks\CommerceCore\Enums\PaymentStatus;
use Webfolks\CommerceCore\Models\Cart;
use Webfolks\CommerceCore\Models\ProductVariant;

test('cancels a paid order, refunds, and returns reserved stock', function () {
    $variant = ProductVariant::factory()->create(['price' => '15.00', 'stock' => 6]);
    $cart = Cart::factory()->create();
    app(AddToCartAction::class)->execute($cart, $variant, 2);

    $order = app(PlaceOrderAction::class)->execute($cart, [
        'name' => 'Test Buyer',
        'line1' => '10 Market St',
        'city' => 'Austin',
        'postal_code' => '78701',
        'country' => 'US',
    ]);

    expect($variant->refresh()->stock)->toBe(4);

    $order = app(CancelOrderAction::class)->execute($order);

    expect($order->status)->toBe(OrderStatus::Cancelled)
        ->and($order->payment_status)->toBe(PaymentStatus::Refunded)
        ->and($variant->refresh()->stock)->toBe(6);
});
