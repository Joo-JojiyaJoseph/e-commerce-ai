<?php

namespace Webfolks\CommerceCore\Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use Webfolks\CommerceCore\Enums\CartStatus;
use Webfolks\CommerceCore\Models\Cart;

/**
 * @extends Factory<Cart>
 */
class CartFactory extends Factory
{
    protected $model = Cart::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'user_id' => null,
            'status' => CartStatus::Active,
            'currency' => 'USD',
            'subtotal' => '0.00',
            'discount_total' => '0.00',
            'shipping_total' => '0.00',
            'tax_total' => '0.00',
            'total' => '0.00',
        ];
    }
}
