<?php

namespace Webfolks\CommerceCore\Contracts;

use Illuminate\Support\Collection;
use Webfolks\CommerceCore\Models\Cart;
use Webfolks\CommerceCore\Shipping\ShippingRate;

interface ShippingRateProvider
{
    /**
     * @param  array<string, mixed>  $destination
     * @return Collection<int, ShippingRate>
     */
    public function ratesFor(Cart $cart, array $destination): Collection;
}
