<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Review;
use App\Models\StoreNotification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Webfolks\CommerceCore\Enums\OrderStatus;
use Webfolks\CommerceCore\Enums\PaymentStatus;
use Webfolks\CommerceCore\Models\Order;
use Webfolks\CommerceCore\Models\ProductVariant;

class DashboardController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json([
            'data' => [
                'sales' => (string) Order::query()
                    ->where('payment_status', PaymentStatus::Completed)
                    ->sum('total'),
                'orders' => Order::query()->count(),
                'customers' => User::query()->count(),
                'products' => Product::query()->count(),
                'pending_orders' => Order::query()
                    ->whereIn('status', [OrderStatus::Pending, OrderStatus::Confirmed, OrderStatus::Processing])
                    ->count(),
                'pending_reviews' => Review::query()->where('status', 'pending')->count(),
                'low_stock' => ProductVariant::query()->where('stock', '>', 0)->where('stock', '<=', 5)->count(),
                'out_of_stock' => ProductVariant::query()->where('stock', '<=', 0)->count(),
                'notification_activity' => StoreNotification::query()->where('created_at', '>=', now()->subDay())->count(),
            ],
        ]);
    }
}
