<?php

namespace Webfolks\CommerceCore\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Webfolks\CommerceCore\Actions\PlaceOrderAction;
use Webfolks\CommerceCore\Enums\PaymentStatus;
use Webfolks\CommerceCore\Http\Requests\CheckoutRequest;
use Webfolks\CommerceCore\Http\Resources\OrderResource;
use Webfolks\CommerceCore\Support\CurrentCart;

class CheckoutController
{
    public function store(
        CheckoutRequest $request,
        CurrentCart $currentCart,
        PlaceOrderAction $placeOrder,
    ): JsonResponse {
        $payment = $request->validated('payment') ?? [];
        $payment['shipping_code'] = $request->validated('shipping_code');

        $order = $placeOrder->execute(
            $currentCart->get(),
            $request->validated('shipping_address'),
            $payment,
            ['item_ids' => $request->validated('item_ids') ?? []],
        );

        $status = $order->payment_status === PaymentStatus::Failed ? 422 : 201;

        return (new OrderResource($order))
            ->response()
            ->setStatusCode($status);
    }
}
