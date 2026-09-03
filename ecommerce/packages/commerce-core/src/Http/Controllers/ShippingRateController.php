<?php

namespace Webfolks\CommerceCore\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Webfolks\CommerceCore\Contracts\ShippingRateProvider;
use Webfolks\CommerceCore\Support\CurrentCart;

class ShippingRateController
{
    public function index(Request $request, CurrentCart $currentCart, ShippingRateProvider $shipping): JsonResponse
    {
        $destination = $request->validate([
            'country' => ['nullable', 'string', 'size:2'],
            'postal_code' => ['nullable', 'string', 'max:32'],
            'city' => ['nullable', 'string', 'max:120'],
        ]);

        $rates = $shipping->ratesFor($currentCart->get(), $destination);

        return response()->json([
            'data' => $rates->map->toArray()->values(),
        ]);
    }
}
