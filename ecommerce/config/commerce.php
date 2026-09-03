<?php

use App\Models\Product;
use Webfolks\CommerceCore\Inventory\SimpleInventoryAllocator;
use Webfolks\CommerceCore\Models\Cart;
use Webfolks\CommerceCore\Models\CartItem;
use Webfolks\CommerceCore\Models\Discount;
use Webfolks\CommerceCore\Models\Order;
use Webfolks\CommerceCore\Models\OrderItem;
use Webfolks\CommerceCore\Models\ProductVariant;
use Webfolks\CommerceCore\Payments\StripeGateway;
use Webfolks\CommerceCore\Pricing\DefaultPricingEngine;
use Webfolks\CommerceCore\Shipping\FlatRateProvider;

return [

    'currency' => env('COMMERCE_CURRENCY', 'USD'),

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
        'razorpay' => [
            'key_id' => env('RAZORPAY_KEY_ID'),
            'key_secret' => env('RAZORPAY_KEY_SECRET'),
            'webhook_secret' => env('RAZORPAY_WEBHOOK_SECRET'),
        ],
        'paypal' => [
            'client_id' => env('PAYPAL_CLIENT_ID'),
            'client_secret' => env('PAYPAL_CLIENT_SECRET'),
            'webhook_id' => env('PAYPAL_WEBHOOK_ID'),
            'mode' => env('PAYPAL_MODE', 'sandbox'),
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

    'cod' => [
        'enabled' => env('COMMERCE_COD_ENABLED', true),
        'min_order' => env('COMMERCE_COD_MIN'),
        'max_order' => env('COMMERCE_COD_MAX'),
    ],

];
