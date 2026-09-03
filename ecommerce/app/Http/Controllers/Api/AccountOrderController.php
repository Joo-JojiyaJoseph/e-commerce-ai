<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrderStatusHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Webfolks\CommerceCore\Actions\CancelOrderAction;
use Webfolks\CommerceCore\Http\Resources\OrderResource;
use Webfolks\CommerceCore\Models\Order;

class AccountOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orders = Order::query()
            ->with('items')
            ->where('user_id', $request->user()->id)
            ->latest('id')
            ->paginate(10);

        return OrderResource::collection($orders)->response();
    }

    public function show(Request $request, string $order): JsonResponse
    {
        $model = Order::query()
            ->with(['items'])
            ->where('user_id', $request->user()->id)
            ->where('number', $order)
            ->firstOrFail();

        $timeline = OrderStatusHistory::query()
            ->where('order_id', $model->id)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => (new OrderResource($model))->resolve(),
            'timeline' => $timeline,
        ]);
    }

    public function cancel(Request $request, string $order, CancelOrderAction $cancelOrder): JsonResponse
    {
        $model = Order::query()
            ->where('user_id', $request->user()->id)
            ->where('number', $order)
            ->firstOrFail();

        $model = $cancelOrder->execute($model);

        OrderStatusHistory::query()->create([
            'order_id' => $model->id,
            'status' => $model->status->value,
            'payment_status' => $model->payment_status->value,
            'note' => 'Customer cancelled the order.',
            'created_at' => now(),
        ]);

        return response()->json([
            'data' => (new OrderResource($model->load('items')))->resolve(),
        ]);
    }
}
