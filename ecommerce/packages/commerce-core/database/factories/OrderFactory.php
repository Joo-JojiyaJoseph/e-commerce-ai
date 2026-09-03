<?php

namespace Webfolks\CommerceCore\Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Webfolks\CommerceCore\Enums\OrderStatus;
use Webfolks\CommerceCore\Enums\PaymentStatus;
use Webfolks\CommerceCore\Models\Order;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    protected $model = Order::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'number' => Order::generateNumber(),
            'status' => OrderStatus::Pending,
            'payment_status' => PaymentStatus::Pending,
            'currency' => 'USD',
            'subtotal' => '20.00',
            'discount_total' => '0.00',
            'shipping_total' => '5.00',
            'tax_total' => '0.00',
            'total' => '25.00',
            'shipping_address' => [
                'name' => fake()->name(),
                'line1' => fake()->streetAddress(),
                'city' => fake()->city(),
                'postal_code' => fake()->postcode(),
                'country' => 'US',
            ],
        ];
    }

    public function paid(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => OrderStatus::Paid,
            'payment_status' => PaymentStatus::Completed,
            'payment_gateway' => 'fake',
            'payment_reference' => 'fake_test',
        ]);
    }
}
