<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Webfolks\CommerceCore\Models\Product as BaseProduct;

/**
 * @property int|null $brand_id
 * @property string|null $image_url
 * @property Carbon|null $deleted_at
 * @property-read float|null $rating_avg
 * @property-read int|null $reviews_count
 */
#[Fillable(['name', 'slug', 'description', 'status', 'meta', 'brand_id', 'image_url'])]
class Product extends BaseProduct implements HasMedia
{
    use InteractsWithMedia;
    use SoftDeletes;

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /**
     * @return BelongsTo<Brand, $this>
     */
    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    /**
     * @return BelongsToMany<Category, $this>
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class)->withTimestamps();
    }

    /**
     * @return HasMany<Review, $this>
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /**
     * @return HasMany<Review, $this>
     */
    public function approvedReviews(): HasMany
    {
        return $this->reviews()->where('status', 'approved');
    }

    /**
     * @return HasMany<ProductImage, $this>
     */
    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order')->orderBy('id');
    }

    public function syncPrimaryImageUrl(): void
    {
        $primary = $this->images()->where('is_primary', true)->first() ?? $this->images()->first();

        $this->forceFill([
            'image_url' => $primary?->url(),
        ])->saveQuietly();
    }
}
