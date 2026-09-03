<?php

namespace Webfolks\CommerceCore\Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Webfolks\CommerceCore\Enums\DiscountType;
use Webfolks\CommerceCore\Models\Discount;

/**
 * @extends Factory<Discount>
 */
class DiscountFactory extends Factory
{
    protected $model = Discount::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => strtoupper(fake()->unique()->bothify('SAVE##')),
            'name' => 'Test discount',
            'type' => DiscountType::Percentage,
            'value' => 10,
            'min_subtotal' => null,
            'max_uses' => null,
            'used_count' => 0,
            'is_active' => true,
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addMonth(),
        ];
    }

    public function fixed(string $amount = '5.00'): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => DiscountType::Fixed,
            'value' => $amount,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
