<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Laravel\Sanctum\Sanctum;

test('registers a customer and returns a sanctum token', function () {
    $response = $this->postJson('/api/auth/register', [
        'name' => 'Asha Buyer',
        'email' => 'asha@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.email', 'asha@example.com')
        ->assertJsonStructure(['data' => ['id', 'name', 'email', 'token']]);

    $this->assertDatabaseHas('users', ['email' => 'asha@example.com']);
});

test('logs in with valid credentials', function () {
    $user = User::factory()->create([
        'email' => 'casey@example.com',
        'password' => Hash::make('password'),
    ]);

    $this->postJson('/api/auth/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertOk()
        ->assertJsonPath('data.email', $user->email)
        ->assertJsonStructure(['data' => ['token']]);
});

test('rejects invalid login credentials', function () {
    User::factory()->create(['email' => 'casey@example.com']);

    $this->postJson('/api/auth/login', [
        'email' => 'casey@example.com',
        'password' => 'wrong-password',
    ])->assertUnprocessable();
});

test('returns the authenticated customer', function () {
    $user = User::factory()->create();

    Sanctum::actingAs($user);

    $this->getJson('/api/auth/me')
        ->assertOk()
        ->assertJsonPath('data.email', $user->email)
        ->assertJsonMissingPath('data.token');
});

test('sends a password reset link without revealing whether the email exists', function () {
    User::factory()->create(['email' => 'casey@example.com']);

    $this->postJson('/api/auth/forgot-password', [
        'email' => 'casey@example.com',
    ])->assertOk()
        ->assertJsonPath('message', 'If that email exists, a reset link was sent.');

    $this->postJson('/api/auth/forgot-password', [
        'email' => 'missing@example.com',
    ])->assertOk()
        ->assertJsonPath('message', 'If that email exists, a reset link was sent.');
});

test('resets a password with a valid token', function () {
    $user = User::factory()->create(['email' => 'casey@example.com']);
    $token = Password::broker()->createToken($user);

    $this->postJson('/api/auth/reset-password', [
        'email' => $user->email,
        'token' => $token,
        'password' => 'new-password',
        'password_confirmation' => 'new-password',
    ])->assertOk();

    $user->refresh();

    expect(Hash::check('new-password', $user->password))->toBeTrue();
});

test('authenticated customers can change their password from their profile', function () {
    $user = User::factory()->create([
        'password' => Hash::make('password'),
    ]);

    Sanctum::actingAs($user);

    $this->patchJson('/api/auth/password', [
        'current_password' => 'password',
        'password' => 'fresh-password',
        'password_confirmation' => 'fresh-password',
    ])->assertOk();

    expect(Hash::check('fresh-password', $user->refresh()->password))->toBeTrue();
});
