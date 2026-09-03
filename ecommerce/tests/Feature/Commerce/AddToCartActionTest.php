<?php

use Webfolks\CommerceCore\Actions\AddToCartAction;
use Webfolks\CommerceCore\Enums\ProductStatus;
use Webfolks\CommerceCore\Exceptions\InsufficientInventoryException;
use Webfolks\CommerceCore\Models\Cart;
use Webfolks\CommerceCore\Models\Product;
use Webfolks\CommerceCore\Models\ProductVariant;

test('adds a variant to the cart and snapshots the unit price', function () {
    $variant = ProductVariant::factory()
        ->for(Product::factory()->state(['status' => ProductStatus::Active]))
        ->create(['price' => '29.50', 'stock' => 10]);

    $cart = Cart::factory()->create();

    $item = app(AddToCartAction::class)->execute($cart, $variant, 2);

    expect($item->quantity)->toBe(2)
        ->and($item->unit_price)->toBe('29.50')
        ->and($item->line_total)->toBe('59.00')
        ->and($cart->refresh()->total)->toBe('59.00');
});

test('increments quantity when the same variant is added again', function () {
    $variant = ProductVariant::factory()->create(['price' => '10.00', 'stock' => 8]);
    $cart = Cart::factory()->create();
    $action = app(AddToCartAction::class);

    $action->execute($cart, $variant, 1);
    $item = $action->execute($cart, $variant, 2);

    expect($cart->items()->count())->toBe(1)
        ->and($item->quantity)->toBe(3)
        ->and($item->line_total)->toBe('30.00');
});

test('rejects adding more units than available stock', function () {
    $variant = ProductVariant::factory()->create(['stock' => 1]);
    $cart = Cart::factory()->create();

    app(AddToCartAction::class)->execute($cart, $variant, 2);
})->throws(InsufficientInventoryException::class);
