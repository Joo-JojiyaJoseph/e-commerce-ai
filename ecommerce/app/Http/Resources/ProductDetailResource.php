<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Models\ProductImage;
use App\Support\ProductExperience;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Product
 */
class ProductDetailResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $images = $this->relationLoaded('images') ? $this->images : collect();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'image_url' => ($images->firstWhere('is_primary', true) ?? $images->first())?->url() ?? $this->image_url,
            'images' => $images->map(fn (ProductImage $image) => [
                'id' => $image->id,
                'url' => $image->url(),
                'alt_text' => $image->alt_text,
                'is_primary' => $image->is_primary,
                'variant_id' => $image->variant_id,
                'sort_order' => $image->sort_order,
            ])->values(),
            'brand' => $this->brand ? [
                'name' => $this->brand->name,
                'slug' => $this->brand->slug,
            ] : null,
            'categories' => $this->categories->map(fn ($category) => [
                'name' => $category->name,
                'slug' => $category->slug,
            ])->values(),
            ...ProductExperience::fromMeta($this->meta),
            'rating_avg' => round((float) ($this->rating_avg ?? 0), 1),
            'review_count' => (int) ($this->reviews_count ?? 0),
            'variants' => $this->variants->map(fn ($variant) => [
                'id' => $variant->id,
                'sku' => $variant->sku,
                'price' => $variant->price,
                'compare_at_price' => $variant->getAttribute('compare_at_price'),
                'stock' => $variant->stock,
                'attributes' => $variant->attributes,
            ])->values(),
        ];
    }
}
