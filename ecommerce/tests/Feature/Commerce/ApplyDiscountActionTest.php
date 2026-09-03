<?php

use Webfolks\CommerceCore\Actions\AddToCartAction;
use Webfolks\CommerceCore\Actions\ApplyDiscountAction;
use Webfolks\CommerceCore\Exceptions\InvalidDiscountException;
use Webfolks\CommerceCore\Models\Cart;
use Webfolks\CommerceCore\Models\Discount;
use Webfolks\CommerceCore\Models\ProductVariant;

test('applies a percentage coupon to the cart total', function () {
    $variant = ProductVariant::factory()->create(['price' => '50.00', 'stock' => 5]);
    $cart = Cart::factory()->create();
    app(AddToCartAction::class)->execute($cart, $variant, 2);
    Discount::factory()->create(['code' => 'SAVE10', 'value' => 10]);

    $cart = app(ApplyDiscountAction::class)->execute($cart, 'save10');

    expect($cart->discount_total)->toBe('10.00')
        ->and($cart->total)->toBe('90.00');
});

test('rejects an inactive discount code', function () {
    $cart = Cart::factory()->create();
    Discount::factory()->inactive()->create(['code' => 'OLD']);

    app(ApplyDiscountAction::class)->execute($cart, 'OLD');
})->throws(InvalidDiscountException::class);
