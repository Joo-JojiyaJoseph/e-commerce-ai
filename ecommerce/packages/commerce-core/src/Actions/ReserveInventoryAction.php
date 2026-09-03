<?php

namespace Webfolks\CommerceCore\Actions;

use Webfolks\CommerceCore\Contracts\InventoryAllocator;
use Webfolks\CommerceCore\Models\ProductVariant;

class ReserveInventoryAction
{
    public function __construct(protected InventoryAllocator $inventory) {}

    public function execute(ProductVariant $variant, int $quantity): void
    {
        $this->inventory->reserve($variant, $quantity);
    }
}
