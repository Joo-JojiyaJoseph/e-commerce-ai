<?php

namespace Webfolks\CommerceCore\Http\Controllers;

use Webfolks\CommerceCore\Commerce;
use Webfolks\CommerceCore\Http\Resources\OrderResource;

class OrderController
{
    public function show(string $order): OrderResource
    {
        return new OrderResource(
            Commerce::query('order')->with('items')->where('number', $order)->firstOrFail()
        );
    }
}
