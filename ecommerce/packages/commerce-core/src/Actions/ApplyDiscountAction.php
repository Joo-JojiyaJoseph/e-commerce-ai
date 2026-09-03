<?php

namespace Webfolks\CommerceCore\Actions;

use Webfolks\CommerceCore\Commerce;
use Webfolks\CommerceCore\Contracts\PricingEngine;
use Webfolks\CommerceCore\Exceptions\InvalidDiscountException;
use Webfolks\CommerceCore\Models\Cart;
use Webfolks\CommerceCore\Models\Discount;
use Webfolks\CommerceCore\Support\Money;

class ApplyDiscountAction
{
    public function __construct(protected PricingEngine $pricing) {}

    public function execute(Cart $cart, string $code): Cart
    {
        $discount = Commerce::query('discount')
            ->usable()
            ->whereRaw('UPPER(code) = ?', [mb_strtoupper($code)])
            ->first();

        if (! $discount instanceof Discount) {
            throw InvalidDiscountException::code($code);
        }

        $cart = $this->pricing->applyDiscounts($cart);

        if (! $discount->isCurrentlyValid(Money::of($cart->subtotal))) {
            throw InvalidDiscountException::code($code);
        }

        $cart->discount()->associate($discount);
        $cart->save();

        return $this->pricing->applyDiscounts($cart);
    }
}
