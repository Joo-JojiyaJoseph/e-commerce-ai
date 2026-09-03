<?php

namespace Webfolks\CommerceCore\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Webfolks\CommerceCore\Commerce;

class StoreCartItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'variant_id' => ['required', 'integer', Rule::exists(Commerce::modelClass('product_variant'), 'id')],
            'quantity' => ['required', 'integer', 'min:1', 'max:99'],
        ];
    }
}
