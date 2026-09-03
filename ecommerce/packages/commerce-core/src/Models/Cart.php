<?php

namespace Webfolks\CommerceCore\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Webfolks\CommerceCore\Commerce;
use Webfolks\CommerceCore\Database\Factories\CartFactory;
use Webfolks\CommerceCore\Enums\CartStatus;

/**
 * @property int $id
 * @property string $uuid
 * @property int|null $user_id
 * @property int|null $discount_id
 * @property CartStatus $status
 * @property string $currency
 * @property string $subtotal
 * @property string $discount_total
 * @property string $shipping_total
 * @property string $tax_total
 * @property string $total
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'uuid',
    'user_id',
    'discount_id',
    'status',
    'currency',
    'subtotal',
    'discount_total',
    'shipping_total',
    'tax_total',
    'total',
])]
class Cart extends Model
{
    /** @use HasFactory<CartFactory> */
    use HasFactory;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'active',
        'subtotal' => '0.00',
        'discount_total' => '0.00',
        'shipping_total' => '0.00',
        'tax_total' => '0.00',
        'total' => '0.00',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => CartStatus::class,
            'subtotal' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'shipping_total' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    /**
     * @return HasMany<CartItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(Commerce::modelClass('cart_item'));
    }

    /**
     * @return BelongsTo<Discount, $this>
     */
    public function discount(): BelongsTo
    {
        return $this->belongsTo(Commerce::modelClass('discount'));
    }

    public function markAsConverted(): void
    {
        $this->forceFill([
            'status' => CartStatus::Converted,
        ])->save();
    }

    public function markAsAbandoned(): void
    {
        $this->forceFill([
            'status' => CartStatus::Abandoned,
        ])->save();
    }

    protected static function newFactory(): CartFactory
    {
        return CartFactory::new();
    }
}
