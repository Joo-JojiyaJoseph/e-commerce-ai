<?php

namespace Webfolks\CommerceCore\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Webfolks\CommerceCore\Database\Factories\DiscountFactory;
use Webfolks\CommerceCore\Enums\DiscountType;
use Webfolks\CommerceCore\Support\Money;

/**
 * @property int $id
 * @property string $code
 * @property string $name
 * @property DiscountType $type
 * @property string $value
 * @property string|null $min_subtotal
 * @property int|null $max_uses
 * @property int $used_count
 * @property bool $is_active
 * @property Carbon|null $starts_at
 * @property Carbon|null $ends_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'code',
    'name',
    'type',
    'value',
    'min_subtotal',
    'max_uses',
    'used_count',
    'is_active',
    'starts_at',
    'ends_at',
])]
class Discount extends Model
{
    /** @use HasFactory<DiscountFactory> */
    use HasFactory;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'used_count' => 0,
        'is_active' => true,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => DiscountType::class,
            'value' => 'decimal:2',
            'min_subtotal' => 'decimal:2',
            'max_uses' => 'integer',
            'used_count' => 'integer',
            'is_active' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    #[Scope]
    protected function usable(Builder $query): Builder
    {
        $now = now();

        return $query
            ->where('is_active', true)
            ->where(function (Builder $starts) use ($now): void {
                $starts->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
            })
            ->where(function (Builder $ends) use ($now): void {
                $ends->whereNull('ends_at')->orWhere('ends_at', '>=', $now);
            });
    }

    public function isCurrentlyValid(string $subtotal = '0.00'): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if ($this->starts_at && $this->starts_at->isFuture()) {
            return false;
        }

        if ($this->ends_at && $this->ends_at->isPast()) {
            return false;
        }

        if ($this->max_uses !== null && $this->used_count >= $this->max_uses) {
            return false;
        }

        if ($this->min_subtotal !== null && Money::isGreaterThan(Money::of($this->min_subtotal), $subtotal)) {
            return false;
        }

        return true;
    }

    protected static function newFactory(): DiscountFactory
    {
        return DiscountFactory::new();
    }
}
