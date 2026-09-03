<?php

namespace Webfolks\CommerceCore\Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Webfolks\CommerceCore\Models\Product;
use Webfolks\CommerceCore\Models\ProductVariant;

/**
 * @extends Factory<ProductVariant>
 */
class ProductVariantFactory extends Factory
{
    protected $model = ProductVariant::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'sku' => strtoupper(fake()->unique()->bothify('SKU-####??')),
            'price' => fake()->randomFloat(2, 8, 180),
            'stock' => 25,
            'attributes' => ['size' => fake()->randomElement(['S', 'M', 'L'])],
        ];
    }

    public function outOfStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'stock' => 0,
        ]);
    }
}
