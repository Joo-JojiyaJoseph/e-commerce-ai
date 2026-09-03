<?php

namespace Webfolks\CommerceCore\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Webfolks\CommerceCore\Models\Product;

/**
 * @mixin Product
 */
class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'image_url' => $this->resource->getAttribute('image_url'),
            'status' => $this->status,
            'meta' => $this->meta,
            'variants' => ProductVariantResource::collection($this->whenLoaded('variants')),
        ];
    }
}
