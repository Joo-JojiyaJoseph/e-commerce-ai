<?php

use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('creates lists and deletes a customer address', function () {
    $user = User::factory()->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/commerce/addresses', [
        'name' => 'Asha Buyer',
        'phone' => '9876543210',
        'line1' => '12 Lake View',
        'city' => 'Bengaluru',
        'region' => 'KA',
        'postal_code' => '560001',
        'country' => 'IN',
        'is_default' => true,
    ])
        ->assertCreated()
        ->assertJsonPath('data.city', 'Bengaluru');

    $this->getJson('/api/commerce/addresses')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    $addressId = $user->addresses()->value('id');

    $this->deleteJson("/api/commerce/addresses/{$addressId}")
        ->assertOk();

    $this->getJson('/api/commerce/addresses')
        ->assertJsonCount(0, 'data');
});

test('normalizes country and rejects an invalid pin', function () {
    $user = User::factory()->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/commerce/addresses', [
        'name' => 'Asha Buyer',
        'line1' => '12 Lake View',
        'city' => 'Bengaluru',
        'postal_code' => '560001',
        'country' => 'in',
    ])
        ->assertCreated()
        ->assertJsonPath('data.country', 'IN');

    $this->postJson('/api/commerce/addresses', [
        'name' => 'Asha Buyer',
        'line1' => '12 Lake View',
        'city' => 'Bengaluru',
        'postal_code' => '12',
        'country' => 'IN',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['postal_code']);
});
