<?php

namespace Webfolks\CommerceCore\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $address = $this->input('shipping_address');

        if (! is_array($address)) {
            return;
        }

        if (isset($address['country'])) {
            $address['country'] = strtoupper(substr((string) $address['country'], 0, 2));
        }

        if (array_key_exists('phone', $address)) {
            $address['phone'] = trim((string) $address['phone']);
        }

        $this->merge(['shipping_address' => $address]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'shipping_address' => ['required', 'array'],
            'shipping_address.name' => ['required', 'string', 'max:80', 'regex:/^[\p{L}\s.\'-]+$/u'],
            'shipping_address.phone' => ['required', 'string', 'max:20', 'regex:/^[+]?[\d\s()-]{8,20}$/'],
            'shipping_address.line1' => ['required', 'string', 'max:255'],
            'shipping_address.line2' => ['nullable', 'string', 'max:255'],
            'shipping_address.city' => ['required', 'string', 'max:120'],
            'shipping_address.region' => ['nullable', 'string', 'max:120'],
            'shipping_address.postal_code' => ['required', 'string', 'max:12', 'regex:/^[A-Za-z0-9\s-]{3,12}$/'],
            'shipping_address.country' => ['required', 'string', 'size:2', 'regex:/^[A-Z]{2}$/'],
            'shipping_code' => ['nullable', 'string', 'max:64'],
            'payment' => ['nullable', 'array'],
            'payment.method' => ['nullable', 'string', 'in:online,cod,stripe,razorpay,paypal'],
            'payment.payment_method' => ['nullable', 'string', 'max:255'],
            'item_ids' => ['nullable', 'array', 'max:50'],
            'item_ids.*' => ['integer', 'min:1'],
        ];
    }
}
