<?php

use Illuminate\Support\Facades\Route;
use Webfolks\CommerceCore\Http\Controllers\CartController;
use Webfolks\CommerceCore\Http\Controllers\CartDiscountController;
use Webfolks\CommerceCore\Http\Controllers\CartItemController;
use Webfolks\CommerceCore\Http\Controllers\CheckoutController;
use Webfolks\CommerceCore\Http\Controllers\OrderController;
use Webfolks\CommerceCore\Http\Controllers\ProductController;
use Webfolks\CommerceCore\Http\Controllers\ShippingRateController;
use Webfolks\CommerceCore\Http\Controllers\StripeWebhookController;

Route::middleware('api')
    ->prefix('api/commerce')
    ->name('commerce.')
    ->group(function (): void {
        Route::get('products', [ProductController::class, 'index'])->name('products.index');
        Route::get('products/{product}', [ProductController::class, 'show'])->name('products.show');

        Route::get('cart', [CartController::class, 'show'])->name('cart.show');
        Route::post('cart/items', [CartItemController::class, 'store'])->name('cart.items.store');
        Route::patch('cart/items/{cartItem}', [CartItemController::class, 'update'])->name('cart.items.update');
        Route::delete('cart/items/{cartItem}', [CartItemController::class, 'destroy'])->name('cart.items.destroy');
        Route::post('cart/discount', [CartDiscountController::class, 'store'])->name('cart.discount.store');
        Route::delete('cart/discount', [CartDiscountController::class, 'destroy'])->name('cart.discount.destroy');

        Route::get('orders/{order}', [OrderController::class, 'show'])->name('orders.show');
        Route::get('shipping-rates', [ShippingRateController::class, 'index'])->name('shipping-rates.index');
        Route::post('checkout', [CheckoutController::class, 'store'])
            ->middleware('throttle:commerce-checkout')
            ->name('checkout.store');

        Route::post('webhooks/stripe', [StripeWebhookController::class, 'store'])->name('webhooks.stripe');
    });
