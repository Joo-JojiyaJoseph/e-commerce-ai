<?php

namespace Webfolks\CommerceCore\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Webfolks\CommerceCore\Commerce;
use Webfolks\CommerceCore\Database\Factories\OrderFactory;
use Webfolks\CommerceCore\Enums\OrderStatus;
use Webfolks\CommerceCore\Enums\PaymentStatus;

/**
 * @property int $id
 * @property string $number
 * @property int|null $user_id
 * @property int|null $cart_id
 * @property int|null $discount_id
 * @property OrderStatus $status
 * @property PaymentStatus $payment_status
 * @property string|null $payment_gateway
 * @property string|null $payment_reference
 * @property string|null $payment_message
 * @property string $currency
 * @property string $subtotal
 * @property string $discount_total
 * @property string $shipping_total
 * @property string $tax_total
 * @property string $total
 * @property array<string, mixed> $shipping_address
 * @property array<string, mixed>|null $billing_address
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'number',
    'user_id',
    'cart_id',
    'discount_id',
    'status',
    'payment_status',
    'payment_gateway',
    'payment_reference',
    'payment_message',
    'currency',
    'subtotal',
    'discount_total',
    'shipping_total',
    'tax_total',
    'total',
    'shipping_address',
    'billing_address',
])]
class Order extends Model
{
    /** @use HasFactory<OrderFactory> */
    use HasFactory;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'pending',
        'payment_status' => 'pending',
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
            'status' => OrderStatus::class,
            'payment_status' => PaymentStatus::class,
            'subtotal' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'shipping_total' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'total' => 'decimal:2',
            'shipping_address' => 'array',
            'billing_address' => 'array',
        ];
    }

    /**
     * @param  array<string, mixed>  $shippingAddress
     */
    public static function createFromCart(Cart $cart, array $shippingAddress): static
    {
        $cart->loadMissing(['items.variant.product', 'discount']);

        /** @var static $order */
        $order = static::query()->create([
            'number' => static::generateNumber(),
            'user_id' => $cart->user_id,
            'cart_id' => $cart->id,
            'discount_id' => $cart->discount_id,
            'status' => OrderStatus::Pending,
            'payment_status' => PaymentStatus::Pending,
            'currency' => $cart->currency,
            'subtotal' => $cart->subtotal,
            'discount_total' => $cart->discount_total,
            'shipping_total' => $cart->shipping_total,
            'tax_total' => $cart->tax_total,
            'total' => $cart->total,
            'shipping_address' => $shippingAddress,
            'billing_address' => $shippingAddress,
        ]);

        foreach ($cart->items as $item) {
            $order->items()->create([
                'variant_id' => $item->variant_id,
                'name' => $item->variant?->product?->name ?? 'Item',
                'sku' => $item->variant?->sku ?? '',
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'line_total' => $item->line_total,
            ]);
        }

        return $order->load('items');
    }

    /**
     * @return HasMany<OrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(Commerce::modelClass('order_item'));
    }

    /**
     * @return BelongsTo<Cart, $this>
     */
    public function cart(): BelongsTo
    {
        return $this->belongsTo(Commerce::modelClass('cart'));
    }

    /**
     * @return BelongsTo<Discount, $this>
     */
    public function discount(): BelongsTo
    {
        return $this->belongsTo(Commerce::modelClass('discount'));
    }

    public function markAsPaid(?string $reference = null, ?string $gateway = null): void
    {
        $this->forceFill([
            'status' => OrderStatus::Paid,
            'payment_status' => PaymentStatus::Completed,
            'payment_reference' => $reference ?? $this->payment_reference,
            'payment_gateway' => $gateway ?? $this->payment_gateway,
            'payment_message' => null,
        ])->save();
    }

    public function markAsConfirmed(?string $reference = null, ?string $gateway = null): void
    {
        $this->forceFill([
            'status' => OrderStatus::Confirmed,
            'payment_status' => PaymentStatus::Pending,
            'payment_reference' => $reference ?? $this->payment_reference,
            'payment_gateway' => $gateway ?? $this->payment_gateway,
            'payment_message' => null,
        ])->save();
    }

    public function markAsFailed(string $message, ?string $reference = null, ?string $gateway = null): void
    {
        $this->forceFill([
            'status' => OrderStatus::Failed,
            'payment_status' => PaymentStatus::Failed,
            'payment_reference' => $reference ?? $this->payment_reference,
            'payment_gateway' => $gateway ?? $this->payment_gateway,
            'payment_message' => $message,
        ])->save();
    }

    public function markAsCancelled(): void
    {
        $this->forceFill([
            'status' => OrderStatus::Cancelled,
        ])->save();
    }

    public function markAsRefunded(): void
    {
        $this->forceFill([
            'payment_status' => PaymentStatus::Refunded,
        ])->save();
    }

    public static function generateNumber(): string
    {
        return 'ORD-'.now()->format('Ymd').'-'.strtoupper(Str::random(6));
    }

    protected static function newFactory(): OrderFactory
    {
        return OrderFactory::new();
    }
}
