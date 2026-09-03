<?php

use Webfolks\CommerceCore\Inventory\SimpleInventoryAllocator;
use Webfolks\CommerceCore\Models\Cart;
use Webfolks\CommerceCore\Models\CartItem;
use Webfolks\CommerceCore\Models\Discount;
use Webfolks\CommerceCore\Models\Order;
use Webfolks\CommerceCore\Models\OrderItem;
use Webfolks\CommerceCore\Models\Product;
use Webfolks\CommerceCore\Models\ProductVariant;
use Webfolks\CommerceCore\Payments\StripeGateway;
use Webfolks\CommerceCore\Pricing\DefaultPricingEngine;
use Webfolks\CommerceCore\Shipping\FlatRateProvider;

return [

    'currency' => env('COMMERCE_CURRENCY', 'USD'),

    /*
    |--------------------------------------------------------------------------
    | Extensible models
    |--------------------------------------------------------------------------
    |
    | Client apps that need extra fields or relationships should extend these
    | classes and point the matching key here. Package queries resolve through
    | this map so the core never hard-codes a concrete model class.
    |
    */
    'models' => [
        'product' => Product::class,
        'product_variant' => ProductVariant::class,
        'cart' => Cart::class,
        'cart_item' => CartItem::class,
        'order' => Order::class,
        'order_item' => OrderItem::class,
        'discount' => Discount::class,
    ],

    'payments' => [
        'gateway' => env('COMMERCE_PAYMENT_GATEWAY', StripeGateway::class),
        'stripe' => [
            'key' => env('STRIPE_KEY'),
            'secret' => env('STRIPE_SECRET'),
            'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        ],
    ],

    'shipping' => [
        'provider' => env('COMMERCE_SHIPPING_PROVIDER', FlatRateProvider::class),
        'flat_rate' => [
            'name' => env('COMMERCE_FLAT_RATE_NAME', 'Standard shipping'),
            'code' => env('COMMERCE_FLAT_RATE_CODE', 'flat'),
            'amount' => env('COMMERCE_FLAT_RATE_AMOUNT', '5.00'),
        ],
    ],

    'pricing' => [
        'engine' => env('COMMERCE_PRICING_ENGINE', DefaultPricingEngine::class),
    ],

    'inventory' => [
        'allocator' => env('COMMERCE_INVENTORY_ALLOCATOR', SimpleInventoryAllocator::class),
    ],

    'catalog' => [
        'per_page' => 12,
    ],

];
