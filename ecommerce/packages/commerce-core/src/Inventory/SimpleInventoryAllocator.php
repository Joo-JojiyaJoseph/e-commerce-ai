<?php

namespace Webfolks\CommerceCore\Inventory;

use Webfolks\CommerceCore\Commerce;
use Webfolks\CommerceCore\Contracts\InventoryAllocator;
use Webfolks\CommerceCore\Exceptions\InsufficientInventoryException;
use Webfolks\CommerceCore\Models\ProductVariant;

class SimpleInventoryAllocator implements InventoryAllocator
{
    public function reserve(ProductVariant $variant, int $quantity): void
    {
        $locked = $this->lockVariant($variant);

        if (! $this->isAvailable($locked, $quantity)) {
            throw InsufficientInventoryException::for($locked, $quantity);
        }

        $locked->forceFill([
            'stock' => $locked->stock - $quantity,
        ])->save();
    }

    public function release(ProductVariant $variant, int $quantity): void
    {
        $locked = $this->lockVariant($variant);

        $locked->forceFill([
            'stock' => $locked->stock + $quantity,
        ])->save();
    }

    public function isAvailable(ProductVariant $variant, int $quantity): bool
    {
        return $variant->stock >= $quantity;
    }

    protected function lockVariant(ProductVariant $variant): ProductVariant
    {
        $locked = Commerce::query('product_variant')
            ->whereKey($variant->getKey())
            ->lockForUpdate()
            ->first();

        if (! $locked instanceof ProductVariant) {
            throw InsufficientInventoryException::for($variant, 0);
        }

        return $locked;
    }
}
