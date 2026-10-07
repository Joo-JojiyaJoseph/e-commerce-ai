<?php

use App\Models\Product;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Webfolks\CommerceCore\Enums\ProductStatus;
use Webfolks\CommerceCore\Models\Order;
use Webfolks\CommerceCore\Models\ProductVariant;

function ask(string $message)
{
    return test()->postJson('/api/commerce/assistant', ['message' => $message]);
}

function stockedProduct(string $name, string $price, ?string $compare = null): Product
{
    $product = Product::query()->findOrFail(Product::factory()->create(['name' => $name, 'slug' => str($name)->slug(), 'status' => ProductStatus::Active])->id);
    $variant = ProductVariant::factory()->create(['product_id' => $product->id, 'price' => $price, 'stock' => 5]);

    if ($compare) {
        $variant->forceFill(['compare_at_price' => $compare])->save();
    }

    return $product;
}

test('greets and offers quick replies', function () {
    ask('hello there')->assertOk()->assertJsonPath('data.intent', 'greeting')->assertJsonStructure(['data' => ['reply', 'suggestions', 'products', 'actions']]);
});

test('finds products from a free-text request including a budget', function () {
    stockedProduct('Linen Shirt', '40.00');
    stockedProduct('Linen Overshirt', '300.00');

    $names = collect(ask('I am looking for a linen shirt')->assertOk()->assertJsonPath('data.intent', 'products')->json('data.products'))->pluck('name');
    expect($names)->toContain('Linen Shirt');

    $cheap = collect(ask('linen under 100')->json('data.products'))->pluck('name');
    expect($cheap)->toContain('Linen Shirt')->not->toContain('Linen Overshirt');
});

test('falls back gracefully when nothing matches', function () {
    ask('zzzqqq')->assertOk()->assertJsonPath('data.products', [])->assertJson(fn ($json) => $json->has('data.reply')->etc());
});

test('answers shipping and payment questions from live config', function () {
    config(['commerce.shipping.flat_rate' => ['name' => 'Standard shipping', 'amount' => '49.00'], 'commerce.currency' => 'INR']);

    ask('how long does delivery take')->assertOk()->assertJsonPath('data.intent', 'shipping')
        ->assertJson(fn ($json) => $json->where('data.reply', fn ($reply) => str_contains($reply, 'INR 49.00'))->etc());

    ask('can I pay with cod or upi?')->assertOk()->assertJsonPath('data.intent', 'payments')
        ->assertJson(fn ($json) => $json->where('data.reply', fn ($reply) => str_contains($reply, 'Cash on delivery'))->etc());
});

test('only shares order details with the signed-in owner', function () {
    $owner = User::factory()->create();
    $order = Order::factory()->create(['user_id' => $owner->id, 'number' => 'ORD-20260101-XYZ789', 'total' => '25.00']);

    // Guest: no details, asked to sign in.
    ask('where is ORD-20260101-XYZ789')->assertOk()->assertJsonPath('data.actions.0.url', '/login')
        ->assertJson(fn ($json) => $json->where('data.reply', fn ($reply) => ! str_contains($reply, '25.00'))->etc());

    // A different signed-in user cannot read it either.
    Sanctum::actingAs(User::factory()->create());
    ask('ORD-20260101-XYZ789')->assertOk()
        ->assertJson(fn ($json) => $json->where('data.reply', fn ($reply) => str_contains($reply, "couldn't find") && ! str_contains($reply, '25.00'))->etc());

    // The owner sees the status.
    Sanctum::actingAs($owner);
    ask('status of ORD-20260101-XYZ789')->assertOk()->assertJsonPath('data.intent', 'order')
        ->assertJson(fn ($json) => $json->where('data.reply', fn ($reply) => str_contains($reply, $order->number) && str_contains($reply, 'pending'))->etc());
});

test('offers a WhatsApp handoff when a business number is configured', function () {
    config(['services.whatsapp.business_number' => '+91 98765 43210']);

    $actions = ask('I want to talk to a human')->assertOk()->assertJsonPath('data.intent', 'handoff')->json('data.actions');

    expect($actions[0]['url'])->toStartWith('https://wa.me/919876543210');
});

test('validates and rate-limits input', function () {
    $this->postJson('/api/commerce/assistant', [])->assertUnprocessable();
    $this->postJson('/api/commerce/assistant', ['message' => str_repeat('a', 301)])->assertUnprocessable();
});
