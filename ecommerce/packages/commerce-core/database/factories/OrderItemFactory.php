<?php

namespace Webfolks\CommerceCore\Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Webfolks\CommerceCore\Models\Order;
use Webfolks\CommerceCore\Models\OrderItem;
use Webfolks\CommerceCore\Models\ProductVariant;

/**
 * @extends Factory<OrderItem>
 */
class OrderItemFactory extends Factory
{
    protected $model = OrderItem::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'variant_id' => ProductVariant::factory(),
            'name' => fake()->words(3, true),
            'sku' => strtoupper(fake()->unique()->bothify('SKU-####??')),
            'quantity' => 1,
            'unit_price' => '20.00',
            'line_total' => '20.00',
        ];
    }
}
