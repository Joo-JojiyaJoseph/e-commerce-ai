<?php

namespace Webfolks\CommerceCore\Contracts;

use Webfolks\CommerceCore\Models\Cart;
use Webfolks\CommerceCore\Models\ProductVariant;

interface PricingEngine
{
    public function priceFor(ProductVariant $variant, int $quantity = 1): string;

    public function applyDiscounts(Cart $cart): Cart;
}
