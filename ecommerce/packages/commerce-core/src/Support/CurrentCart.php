<?php

namespace Webfolks\CommerceCore\Support;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Str;
use Webfolks\CommerceCore\Commerce;
use Webfolks\CommerceCore\Enums\CartStatus;
use Webfolks\CommerceCore\Models\Cart;

class CurrentCart
{
    public const TokenHeader = 'X-Cart-Token';

    public function get(?Authenticatable $user = null): Cart
    {
        $user ??= auth()->user();

        if ($user) {
            $cart = Commerce::query('cart')
                ->where('user_id', $user->getAuthIdentifier())
                ->where('status', CartStatus::Active)
                ->latest('id')
                ->first();

            if ($cart instanceof Cart) {
                $this->remember($cart);

                return $cart;
            }
        }

        $token = $this->token();

        if (is_string($token) && $token !== '') {
            $cart = Commerce::query('cart')
                ->where('uuid', $token)
                ->where('status', CartStatus::Active)
                ->first();

            if ($cart instanceof Cart) {
                if ($user && $cart->user_id === null) {
                    $cart->forceFill([
                        'user_id' => $user->getAuthIdentifier(),
                    ])->save();
                }

                $this->remember($cart);

                return $cart;
            }
        }

        /** @var Cart $cart */
        $cart = Commerce::query('cart')->create([
            'uuid' => (string) Str::uuid(),
            'user_id' => $user?->getAuthIdentifier(),
            'status' => CartStatus::Active,
            'currency' => config('commerce.currency'),
            'subtotal' => '0.00',
            'discount_total' => '0.00',
            'shipping_total' => '0.00',
            'tax_total' => '0.00',
            'total' => '0.00',
        ]);

        $this->remember($cart);

        return $cart;
    }

    protected function token(): ?string
    {
        $header = request()->header(self::TokenHeader);

        if (is_string($header) && $header !== '') {
            return $header;
        }

        $sessionId = session('commerce.cart_id');

        return is_string($sessionId) && $sessionId !== '' ? $sessionId : null;
    }

    protected function remember(Cart $cart): void
    {
        session()->put('commerce.cart_id', $cart->uuid);
    }
}
