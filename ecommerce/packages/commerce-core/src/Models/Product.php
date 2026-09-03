<?php

namespace Webfolks\CommerceCore\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Webfolks\CommerceCore\Commerce;
use Webfolks\CommerceCore\Database\Factories\ProductFactory;
use Webfolks\CommerceCore\Enums\ProductStatus;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property ProductStatus $status
 * @property array<string, mixed>|null $meta
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'slug', 'description', 'status', 'meta'])]
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ProductStatus::class,
            'meta' => 'array',
        ];
    }

    /**
     * @return HasMany<ProductVariant, $this>
     */
    public function variants(): HasMany
    {
        return $this->hasMany(Commerce::modelClass('product_variant'));
    }

    #[Scope]
    protected function active(Builder $query): Builder
    {
        return $query->where('status', ProductStatus::Active);
    }

    protected static function newFactory(): ProductFactory
    {
        return ProductFactory::new();
    }
}
