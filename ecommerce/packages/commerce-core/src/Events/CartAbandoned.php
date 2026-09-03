<?php

namespace Webfolks\CommerceCore\Events;

use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Webfolks\CommerceCore\Models\Cart;

class CartAbandoned implements ShouldDispatchAfterCommit
{
    use Dispatchable, SerializesModels;

    public function __construct(public Cart $cart) {}
}
