<?php

namespace Webfolks\CommerceCore\Exceptions;

use Webfolks\CommerceCore\Models\ProductVariant;

class InsufficientInventoryException extends CommerceException
{
    public static function for(ProductVariant $variant, int $quantity): self
    {
        return new self("Not enough inventory for SKU [{$variant->sku}] to reserve {$quantity}.");
    }
}
