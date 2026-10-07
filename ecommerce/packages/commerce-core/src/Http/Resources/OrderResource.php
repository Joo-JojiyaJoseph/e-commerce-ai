<?php

namespace Webfolks\CommerceCore\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Webfolks\CommerceCore\Models\Order;

/**
 * @mixin Order
 */
class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'created_at' => $this->created_at,
            'customer_email' => $this->resource->getAttribute('customer_email'),
            'status' => $this->status,
            'payment_status' => $this->payment_status,
            'payment_gateway' => $this->payment_gateway,
            'payment_reference' => $this->payment_reference,
            'payment' => $this->resource->getAttribute('payment_client'),
            'currency' => $this->currency,
            'subtotal' => $this->subtotal,
            'discount_total' => $this->discount_total,
            'shipping_total' => $this->shipping_total,
            'tax_total' => $this->tax_total,
            'total' => $this->total,
            'shipping_address' => $this->shipping_address,
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->name,
                'sku' => $item->sku,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'line_total' => $item->line_total,
            ])),
        ];
    }
}
