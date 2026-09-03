<?php

use Illuminate\Support\Facades\Event;
use Webfolks\CommerceCore\Actions\AddToCartAction;
use Webfolks\CommerceCore\Actions\PlaceOrderAction;
use Webfolks\CommerceCore\Contracts\PaymentGateway;
use Webfolks\CommerceCore\Enums\OrderStatus;
use Webfolks\CommerceCore\Enums\PaymentStatus;
use Webfolks\CommerceCore\Events\OrderPlaced;
use Webfolks\CommerceCore\Events\PaymentCompleted;
use Webfolks\CommerceCore\Models\Cart;
use Webfolks\CommerceCore\Models\ProductVariant;
use Webfolks\CommerceCore\Payments\FakeGateway;
use Webfolks\CommerceCore\Payments\PaymentResult;

test('places a paid order, reserves stock, and dispatches domain events', function () {
    Event::fake([OrderPlaced::class, PaymentCompleted::class]);

    $variant = ProductVariant::factory()->create(['price' => '40.00', 'stock' => 5]);
    $cart = Cart::factory()->create();
    app(AddToCartAction::class)->execute($cart, $variant, 2);

    $order = app(PlaceOrderAction::class)->execute($cart, shippingAddress());

    expect($order->status)->toBe(OrderStatus::Paid)
        ->and($order->payment_status)->toBe(PaymentStatus::Completed)
        ->and($order->items)->toHaveCount(1)
        ->and($order->shipping_total)->toBe('5.00')
        ->and($variant->refresh()->stock)->toBe(3)
        ->and($cart->refresh()->status->value)->toBe('converted');

    Event::assertDispatched(OrderPlaced::class, fn (OrderPlaced $event) => $event->order->is($order));
    Event::assertDispatched(PaymentCompleted::class);
});

test('marks the order failed and releases stock when payment is declined', function () {
    $variant = ProductVariant::factory()->create(['price' => '12.00', 'stock' => 4]);
    $cart = Cart::factory()->create();
    app(AddToCartAction::class)->execute($cart, $variant);

    $this->app->bind(PaymentGateway::class, fn () => new class extends FakeGateway
    {
        public function charge($order, array $paymentData): PaymentResult
        {
            return PaymentResult::failed('The payment was declined.');
        }
    });

    $order = app(PlaceOrderAction::class)->execute($cart, shippingAddress());

    expect($order->status)->toBe(OrderStatus::Failed)
        ->and($order->payment_status)->toBe(PaymentStatus::Failed)
        ->and($variant->refresh()->stock)->toBe(4)
        ->and($cart->refresh()->status->value)->toBe('active');
});

/**
 * @return array<string, string>
 */
function shippingAddress(): array
{
    return [
        'name' => 'Ada Lovelace',
        'line1' => '1 Analytical Engine Rd',
        'city' => 'London',
        'postal_code' => 'SW1A 1AA',
        'country' => 'GB',
    ];
}
