<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Product
 */
class ProductCardResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $variant = $this->variants->sortBy('price')->first();
        $images = $this->relationLoaded('images') ? $this->images : collect();
        $primary = $images->firstWhere('is_primary', true) ?? $images->first();
        $hover = $images->first(fn (ProductImage $image) => ! $image->is_primary && $image->variant_id === null)
            ?? $images->skip(1)->first();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'image_url' => $primary?->url() ?? $this->image_url,
            'hover_image_url' => $hover?->url(),
            'brand' => $this->brand?->name,
            'variant_id' => $variant?->id,
            'price' => $variant?->price,
            'compare_at_price' => $variant?->getAttribute('compare_at_price'),
            'in_stock' => $variant !== null && (int) $variant->stock > 0,
            'rating_avg' => round((float) ($this->rating_avg ?? 0), 1),
            'review_count' => (int) ($this->reviews_count ?? 0),
        ];
    }
}
