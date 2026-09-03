<?php

namespace Webfolks\CommerceCore\Contracts;

use Webfolks\CommerceCore\Models\ProductVariant;

interface InventoryAllocator
{
    public function reserve(ProductVariant $variant, int $quantity): void;

    public function release(ProductVariant $variant, int $quantity): void;

    public function isAvailable(ProductVariant $variant, int $quantity): bool;
}
