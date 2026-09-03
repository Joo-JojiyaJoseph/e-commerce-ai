<?php

namespace App\Http\Controllers\Api;

use App\Actions\ConfirmPaymentAction;
use App\Http\Controllers\Controller;
use App\Models\OrderStatusHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Webfolks\CommerceCore\Enums\PaymentStatus;
use Webfolks\CommerceCore\Http\Resources\OrderResource;
use Webfolks\CommerceCore\Models\Order;

class PaymentController extends Controller
{
    public function methods(): JsonResponse
    {
        $stripe = filled(config('commerce.payments.stripe.secret')) && filled(config('commerce.payments.stripe.key'));
        $razorpay = filled(config('commerce.payments.razorpay.key_id')) && filled(config('commerce.payments.razorpay.key_secret'));
        $paypal = filled(config('commerce.payments.paypal.client_id')) && filled(config('commerce.payments.paypal.client_secret'));

        return response()->json([
            'data' => [
                'currency' => config('commerce.currency'),
                'methods' => array_values(array_filter([
                    [
                        'id' => 'razorpay',
                        'label' => 'Razorpay',
                        'description' => 'UPI, cards, netbanking, and wallets.',
                        'enabled' => $razorpay,
                        'icon' => 'credit-card',
                    ],
                    [
                        'id' => 'stripe',
                        'label' => 'Stripe',
                        'description' => 'Cards and wallets through Stripe Checkout.',
                        'enabled' => $stripe,
                        'icon' => 'credit-card',
                    ],
                    [
                        'id' => 'paypal',
                        'label' => 'PayPal',
                        'description' => 'PayPal balance or linked cards.',
                        'enabled' => $paypal,
                        'icon' => 'globe-alt',
                    ],
                    [
                        'id' => 'cod',
                        'label' => 'Cash on delivery',
                        'description' => 'Pay when the order arrives.',
                        'enabled' => (bool) config('commerce.cod.enabled', true),
                        'icon' => 'banknotes',
                    ],
                    [
                        'id' => 'online',
                        'label' => 'Test payment',
                        'description' => 'Local gateway used when live keys are not configured.',
                        'enabled' => ! $stripe && ! $razorpay && ! $paypal,
                        'icon' => 'beaker',
                    ],
                ], fn (array $method) => $method['enabled'])),
            ],
        ]);
    }

    public function confirm(Request $request, ConfirmPaymentAction $confirmPayment): JsonResponse
    {
        $validated = $request->validate([
            'order_number' => ['required', 'string'],
            'razorpay_order_id' => ['nullable', 'string'],
            'razorpay_payment_id' => ['nullable', 'string'],
            'razorpay_signature' => ['nullable', 'string'],
            'session_id' => ['nullable', 'string'],
            'paypal_order_id' => ['nullable', 'string'],
            'token' => ['nullable', 'string'],
        ]);

        $order = Order::query()->where('number', $validated['order_number'])->firstOrFail();

        if ($order->user_id && $request->user() && (int) $order->user_id !== (int) $request->user()->id) {
            abort(403, 'This order does not belong to the signed-in customer.');
        }

        $alreadyPaid = $order->payment_status === PaymentStatus::Completed;
        $order = $confirmPayment->execute($order, $validated);

        if (! $alreadyPaid && $order->payment_status === PaymentStatus::Completed) {
            OrderStatusHistory::query()->create([
                'order_id' => $order->id,
                'status' => $order->status->value,
                'payment_status' => $order->payment_status->value,
                'note' => 'Payment verified',
                'created_at' => now(),
            ]);
        }

        return response()->json([
            'data' => (new OrderResource($order))->resolve(),
        ]);
    }
}
