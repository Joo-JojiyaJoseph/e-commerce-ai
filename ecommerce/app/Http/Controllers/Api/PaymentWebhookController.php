<?php

namespace App\Http\Controllers\Api;

use App\Actions\ConfirmPaymentAction;
use App\Http\Controllers\Controller;
use App\Payments\PaypalGateway;
use App\Payments\RazorpayGateway;
use App\Payments\StripeCheckoutGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Webfolks\CommerceCore\Models\Order;

class PaymentWebhookController extends Controller
{
    public function stripe(Request $request, StripeCheckoutGateway $stripe, ConfirmPaymentAction $confirm): JsonResponse
    {
        abort_unless($stripe->verifyWebhook($request), 400);

        $type = $request->input('type');
        $sessionId = $request->input('data.object.id');
        $orderNumber = $request->input('data.object.client_reference_id');

        if ($type === 'checkout.session.completed' && is_string($orderNumber) && is_string($sessionId)) {
            $this->confirmQuietly($confirm, $orderNumber, ['session_id' => $sessionId]);
        }

        return response()->json(['received' => true]);
    }

    public function razorpay(Request $request, RazorpayGateway $razorpay, ConfirmPaymentAction $confirm): JsonResponse
    {
        abort_unless($razorpay->verifyWebhook($request), 400);

        $event = $request->input('event');
        $paymentId = $request->input('payload.payment.entity.id');
        $orderId = $request->input('payload.payment.entity.order_id');
        $notes = $request->input('payload.payment.entity.notes.order_number');

        if ($event === 'payment.captured' && is_string($notes) && is_string($paymentId) && is_string($orderId)) {
            $secret = config('commerce.payments.razorpay.key_secret');
            $signature = is_string($secret) ? hash_hmac('sha256', $orderId.'|'.$paymentId, $secret) : '';

            $this->confirmQuietly($confirm, $notes, [
                'razorpay_order_id' => $orderId,
                'razorpay_payment_id' => $paymentId,
                'razorpay_signature' => $signature,
            ]);
        }

        return response()->json(['received' => true]);
    }

    public function paypal(Request $request, PaypalGateway $paypal, ConfirmPaymentAction $confirm): JsonResponse
    {
        abort_unless($paypal->verifyWebhook($request), 400);

        $event = $request->input('event_type');
        $orderNumber = $request->input('resource.purchase_units.0.reference_id');
        $paypalOrderId = $request->input('resource.id') ?? $request->input('resource.supplementary_data.related_ids.order_id');

        if ($event === 'CHECKOUT.ORDER.APPROVED' && is_string($orderNumber) && is_string($paypalOrderId)) {
            $this->confirmQuietly($confirm, $orderNumber, ['paypal_order_id' => $paypalOrderId]);
        }

        return response()->json(['received' => true]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    protected function confirmQuietly(ConfirmPaymentAction $confirm, string $orderNumber, array $payload): void
    {
        $order = Order::query()->where('number', $orderNumber)->first();

        if (! $order) {
            return;
        }

        try {
            $confirm->execute($order, $payload);
        } catch (\Throwable $exception) {
            Log::warning('Payment webhook confirmation failed', [
                'order' => $orderNumber,
                'message' => $exception->getMessage(),
            ]);
        }
    }
}
