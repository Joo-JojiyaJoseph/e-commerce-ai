<?php

namespace Webfolks\CommerceCore\Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Webfolks\CommerceCore\Models\Cart;
use Webfolks\CommerceCore\Models\CartItem;
use Webfolks\CommerceCore\Models\ProductVariant;

/**
 * @extends Factory<CartItem>
 */
class CartItemFactory extends Factory
{
    protected $model = CartItem::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $price = fake()->randomFloat(2, 10, 80);

        return [
            'cart_id' => Cart::factory(),
            'variant_id' => ProductVariant::factory(),
            'quantity' => 1,
            'unit_price' => $price,
            'line_total' => $price,
        ];
    }
}
