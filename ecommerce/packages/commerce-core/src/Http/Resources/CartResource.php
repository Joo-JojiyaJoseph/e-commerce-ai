<?php

namespace Webfolks\CommerceCore\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Webfolks\CommerceCore\Models\Cart;

/**
 * @mixin Cart
 */
class CartResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'status' => $this->status,
            'currency' => $this->currency,
            'subtotal' => $this->subtotal,
            'discount_total' => $this->discount_total,
            'shipping_total' => $this->shipping_total,
            'tax_total' => $this->tax_total,
            'total' => $this->total,
            'discount' => $this->whenLoaded('discount', fn () => $this->discount ? [
                'code' => $this->discount->code,
                'name' => $this->discount->name,
                'type' => $this->discount->type,
                'value' => $this->discount->value,
            ] : null),
            'items' => CartItemResource::collection($this->whenLoaded('items')),
        ];
    }
}
