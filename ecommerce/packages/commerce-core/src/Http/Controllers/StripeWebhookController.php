<?php

namespace Webfolks\CommerceCore\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Webfolks\CommerceCore\Contracts\PaymentGateway;

class StripeWebhookController
{
    public function store(Request $request, PaymentGateway $payments): JsonResponse
    {
        abort_unless($payments->verifyWebhook($request), 400);

        return response()->json(['received' => true]);
    }
}
