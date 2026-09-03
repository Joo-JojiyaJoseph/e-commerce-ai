<?php

namespace Webfolks\CommerceCore\Shipping;

use Illuminate\Support\Collection;
use Webfolks\CommerceCore\Contracts\ShippingRateProvider;
use Webfolks\CommerceCore\Models\Cart;
use Webfolks\CommerceCore\Support\Money;

class FlatRateProvider implements ShippingRateProvider
{
    /**
     * @param  array<string, mixed>  $destination
     * @return Collection<int, ShippingRate>
     */
    public function ratesFor(Cart $cart, array $destination): Collection
    {
        return collect([
            new ShippingRate(
                code: (string) config('commerce.shipping.flat_rate.code'),
                name: (string) config('commerce.shipping.flat_rate.name'),
                amount: Money::of(config('commerce.shipping.flat_rate.amount')),
            ),
        ]);
    }
}
