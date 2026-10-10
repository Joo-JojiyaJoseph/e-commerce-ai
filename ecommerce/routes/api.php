<?php

use App\Http\Controllers\Api\AccountOrderController;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\Admin\BrandController as AdminBrandController;
use App\Http\Controllers\Api\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Api\Admin\CustomerController as AdminCustomerController;
use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\DiscountController as AdminDiscountController;
use App\Http\Controllers\Api\Admin\IntegrationController as AdminIntegrationController;
use App\Http\Controllers\Api\Admin\InventoryController as AdminInventoryController;
use App\Http\Controllers\Api\Admin\NotificationController as AdminNotificationController;
use App\Http\Controllers\Api\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\Admin\ReviewController as AdminReviewController;
use App\Http\Controllers\Api\AssistantController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\ModelController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PaymentWebhookController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\WishlistController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:auth');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:auth');
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:auth');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:auth');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('me', [AuthController::class, 'me']);
        Route::patch('me', [AuthController::class, 'update']);
        Route::patch('password', [AuthController::class, 'changePassword']);
        Route::post('logout', [AuthController::class, 'logout']);
    });
});

Route::post('contact', [ContactController::class, 'store'])->middleware('throttle:auth');

Route::prefix('commerce')->group(function (): void {
    Route::get('home', [CatalogController::class, 'home']);
    Route::get('shop', [CatalogController::class, 'products']);
    Route::get('suggest', [CatalogController::class, 'suggest']);
    Route::get('catalog/{product}', [CatalogController::class, 'show']);
    Route::get('categories', [CatalogController::class, 'categories']);
    Route::get('brands', [CatalogController::class, 'brands']);
    Route::get('payments/methods', [PaymentController::class, 'methods']);
    Route::post('assistant', AssistantController::class)->middleware('throttle:30,1');
    Route::get('storefront-config', [CatalogController::class, 'storefrontConfig']);
    Route::get('models/{name}', [ModelController::class, 'show'])->where('name', '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.glb');
    Route::post('payments/confirm', [PaymentController::class, 'confirm'])->middleware('throttle:auth');
    Route::post('payments/webhooks/stripe', [PaymentWebhookController::class, 'stripe']);
    Route::post('payments/webhooks/razorpay', [PaymentWebhookController::class, 'razorpay']);
    Route::post('payments/webhooks/paypal', [PaymentWebhookController::class, 'paypal']);
    Route::get('products/{product}/reviews', [ReviewController::class, 'index']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('wishlist', [WishlistController::class, 'index']);
        Route::post('wishlist', [WishlistController::class, 'store']);
        Route::delete('wishlist/{product}', [WishlistController::class, 'destroy']);

        Route::get('addresses', [AddressController::class, 'index']);
        Route::post('addresses', [AddressController::class, 'store']);
        Route::patch('addresses/{address}', [AddressController::class, 'update']);
        Route::delete('addresses/{address}', [AddressController::class, 'destroy']);

        Route::post('products/{product}/reviews', [ReviewController::class, 'store']);
        Route::get('recently-viewed', [CatalogController::class, 'recentlyViewed']);

        Route::get('account/orders', [AccountOrderController::class, 'index']);
        Route::get('account/orders/{order}', [AccountOrderController::class, 'show']);
        Route::post('account/orders/{order}/cancel', [AccountOrderController::class, 'cancel']);
    });
});

Route::middleware('auth:sanctum')->prefix('notifications')->group(function (): void {
    Route::get('/', [NotificationController::class, 'index']);
    Route::get('unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('read-all', [NotificationController::class, 'readAll']);
    Route::post('clear-read', [NotificationController::class, 'clearRead']);
    Route::post('{notification}/read', [NotificationController::class, 'read']);
    Route::delete('{notification}', [NotificationController::class, 'destroy']);
    Route::get('preferences', [NotificationController::class, 'preferences']);
    Route::patch('preferences', [NotificationController::class, 'updatePreferences']);
});

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function (): void {
    Route::get('dashboard', [AdminDashboardController::class, 'show']);
    Route::get('integrations', [AdminIntegrationController::class, 'index']);
    Route::post('models', [ModelController::class, 'store']);

    Route::get('products', [AdminProductController::class, 'index']);
    Route::post('products', [AdminProductController::class, 'store']);
    Route::post('products/bulk-status', [AdminProductController::class, 'bulkStatus']);
    Route::get('products/{product}', [AdminProductController::class, 'show']);
    Route::patch('products/{product}', [AdminProductController::class, 'update']);
    Route::delete('products/{product}', [AdminProductController::class, 'destroy']);
    Route::post('products/{product}/restore', [AdminProductController::class, 'restore']);
    Route::post('products/{product}/images', [AdminProductController::class, 'storeImage']);
    Route::post('products/{product}/images/reorder', [AdminProductController::class, 'reorderImages']);
    Route::post('products/{product}/images/{image}/replace', [AdminProductController::class, 'replaceImage']);
    Route::post('products/{product}/images/{image}/primary', [AdminProductController::class, 'primaryImage']);
    Route::delete('products/{product}/images/{image}', [AdminProductController::class, 'destroyImage']);

    Route::get('categories', [AdminCategoryController::class, 'index']);
    Route::post('categories', [AdminCategoryController::class, 'store']);
    Route::get('categories/{category}', [AdminCategoryController::class, 'show']);
    Route::patch('categories/{category}', [AdminCategoryController::class, 'update']);
    Route::delete('categories/{category}', [AdminCategoryController::class, 'destroy']);
    Route::post('categories/{category}/restore', [AdminCategoryController::class, 'restore']);

    Route::get('brands', [AdminBrandController::class, 'index']);
    Route::post('brands', [AdminBrandController::class, 'store']);
    Route::get('brands/{brand}', [AdminBrandController::class, 'show']);
    Route::patch('brands/{brand}', [AdminBrandController::class, 'update']);
    Route::delete('brands/{brand}', [AdminBrandController::class, 'destroy']);
    Route::post('brands/{brand}/restore', [AdminBrandController::class, 'restore']);

    Route::get('inventory', [AdminInventoryController::class, 'index']);
    Route::patch('inventory/{variant}', [AdminInventoryController::class, 'adjust']);

    Route::get('orders', [AdminOrderController::class, 'index']);
    Route::get('orders/{order}', [AdminOrderController::class, 'show']);
    Route::patch('orders/{order}/status', [AdminOrderController::class, 'updateStatus']);
    Route::post('orders/{order}/cancel', [AdminOrderController::class, 'cancel']);
    Route::get('orders/{order}/whatsapp', [AdminOrderController::class, 'whatsapp']);
    Route::post('orders/{order}/whatsapp', [AdminOrderController::class, 'sendWhatsapp']);

    Route::get('customers', [AdminCustomerController::class, 'index']);
    Route::get('customers/{customer}', [AdminCustomerController::class, 'show']);

    Route::get('reviews', [AdminReviewController::class, 'index']);
    Route::get('reviews/{review}', [AdminReviewController::class, 'show']);
    Route::post('reviews/{review}/approve', [AdminReviewController::class, 'approve']);
    Route::post('reviews/{review}/reject', [AdminReviewController::class, 'reject']);
    Route::delete('reviews/{review}', [AdminReviewController::class, 'destroy']);

    Route::get('coupons', [AdminDiscountController::class, 'index']);
    Route::post('coupons', [AdminDiscountController::class, 'store']);
    Route::get('coupons/{discount}', [AdminDiscountController::class, 'show']);
    Route::patch('coupons/{discount}', [AdminDiscountController::class, 'update']);
    Route::delete('coupons/{discount}', [AdminDiscountController::class, 'destroy']);

    Route::get('notifications', [AdminNotificationController::class, 'index']);
});
