<?php

namespace Webfolks\CommerceCore\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Webfolks\CommerceCore\Models\ProductVariant;

/**
 * @mixin ProductVariant
 */
class ProductVariantResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'price' => $this->price,
            'compare_at_price' => $this->resource->getAttribute('compare_at_price'),
            'stock' => $this->stock,
            'attributes' => $this->attributes,
            'product' => $this->whenLoaded('product', fn () => $this->product ? [
                'id' => $this->product->id,
                'name' => $this->product->name,
                'slug' => $this->product->slug,
                'image_url' => $this->product->image_url,
            ] : null),
        ];
    }
}
