<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\FiltersAdminLists;
use App\Http\Controllers\Controller;
use App\Models\OrderStatusHistory;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Webfolks\CommerceCore\Actions\CancelOrderAction;
use Webfolks\CommerceCore\Enums\OrderStatus;
use Webfolks\CommerceCore\Enums\PaymentStatus;
use Webfolks\CommerceCore\Http\Resources\OrderResource;
use Webfolks\CommerceCore\Models\Order;

class OrderController extends Controller
{
    use FiltersAdminLists;

    public function index(Request $request): JsonResponse
    {
        $query = Order::query()->with('items')->latest('id');

        if ($search = $request->string('q')->toString()) {
            $query->where(function ($builder) use ($search): void {
                $builder->where('number', 'like', '%'.$search.'%')
                    ->orWhere('shipping_address', 'like', '%'.$search.'%')
                    ->orWhereIn('user_id', User::query()->where('email', 'like', '%'.$search.'%')->select('id'));
            });
        }

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($payment = $request->string('payment_status')->toString()) {
            $query->where('payment_status', $payment);
        }

        if ($gateway = $request->string('gateway')->toString()) {
            $query->where('payment_gateway', $gateway);
        }

        $this->applyDateRange($query, $request);
        $this->applyAmountRange($query, $request, 'total');

        $orders = $query->paginate($this->perPage($request));

        // One extra query for the page's customers (Order has no user relation).
        $emails = User::query()
            ->whereIn('id', $orders->getCollection()->pluck('user_id')->filter()->unique()->all())
            ->pluck('email', 'id');

        $orders->getCollection()->each(fn (Order $order) => $order->setAttribute('customer_email', $emails[$order->user_id] ?? null));

        return OrderResource::collection($orders)->response();
    }

    public function show(string $order): JsonResponse
    {
        $model = Order::query()->with('items')->where('number', $order)->firstOrFail();
        $customer = $model->user_id ? User::query()->find($model->user_id) : null;
        $timeline = OrderStatusHistory::query()
            ->where('order_id', $model->id)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => (new OrderResource($model))->resolve(),
            'customer' => $customer ? [
                'id' => $customer->id,
                'name' => $customer->name,
                'email' => $customer->email,
            ] : null,
            'timeline' => $timeline,
        ]);
    }

    public function updateStatus(Request $request, string $order, NotificationService $notifications, WhatsAppService $whatsapp): JsonResponse
    {
        $model = Order::query()->where('number', $order)->firstOrFail();
        $validated = $request->validate([
            'status' => ['required', Rule::enum(OrderStatus::class)],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $status = $validated['status'] instanceof OrderStatus
            ? $validated['status']
            : OrderStatus::from((string) $validated['status']);
        $model->forceFill(['status' => $status])->save();

        if ($status === OrderStatus::Delivered && $model->payment_gateway === 'cod' && $model->payment_status === PaymentStatus::Pending) {
            $model->markAsPaid($model->payment_reference, 'cod');
        }

        OrderStatusHistory::query()->create([
            'order_id' => $model->id,
            'status' => $model->status->value,
            'payment_status' => $model->payment_status->value,
            'note' => $validated['note'] ?? 'Status updated by admin.',
            'created_at' => now(),
        ]);

        $user = $model->user_id ? User::query()->find($model->user_id) : null;

        if ($user) {
            $notifications->send(
                $user,
                'order.'.$model->status->value,
                'Order '.$model->status->value,
                "Order {$model->number} is now {$model->status->value}.",
                '/account/orders/'.$model->number,
                ['order_id' => $model->id, 'order_number' => $model->number],
            );
        }

        if ($whatsapp->configured() && config('services.whatsapp.auto_notify')) {
            $whatsapp->send(data_get($model->shipping_address, 'phone'), $whatsapp->orderMessage($model));
        }

        return response()->json([
            'data' => (new OrderResource($model->refresh()->load('items')))->resolve(),
        ]);
    }

    /**
     * Suggested WhatsApp message + click-to-chat link for an order (works with no API setup).
     */
    public function whatsapp(string $order, WhatsAppService $whatsapp): JsonResponse
    {
        $model = Order::query()->where('number', $order)->firstOrFail();
        $message = $whatsapp->orderMessage($model);
        $phone = data_get($model->shipping_address, 'phone');

        return response()->json(['data' => [
            'message' => $message,
            'phone' => $whatsapp->normalizePhone($phone),
            'link' => $whatsapp->link($phone, $message),
            'api_configured' => $whatsapp->configured(),
        ]]);
    }

    /**
     * Sends a WhatsApp message to the order's customer through the Cloud API (when configured).
     */
    public function sendWhatsapp(Request $request, string $order, WhatsAppService $whatsapp): JsonResponse
    {
        $model = Order::query()->where('number', $order)->firstOrFail();
        $validated = $request->validate(['message' => ['nullable', 'string', 'max:1000']]);

        abort_unless($whatsapp->configured(), 422, 'WhatsApp Cloud API is not configured. Use the click-to-chat link instead.');

        $result = $whatsapp->send(
            data_get($model->shipping_address, 'phone'),
            ($validated['message'] ?? '') ?: $whatsapp->orderMessage($model),
        );

        return response()->json(['data' => $result], $result['sent'] ? 200 : 422);
    }

    public function cancel(string $order, CancelOrderAction $cancelOrder): JsonResponse
    {
        $model = Order::query()->where('number', $order)->firstOrFail();
        $model = $cancelOrder->execute($model);

        OrderStatusHistory::query()->create([
            'order_id' => $model->id,
            'status' => $model->status->value,
            'payment_status' => $model->payment_status->value,
            'note' => 'Cancelled by admin.',
            'created_at' => now(),
        ]);

        return response()->json([
            'data' => (new OrderResource($model->load('items')))->resolve(),
        ]);
    }
}
