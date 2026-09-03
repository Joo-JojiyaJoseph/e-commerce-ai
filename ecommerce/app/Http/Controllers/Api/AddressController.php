<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $request->user()->addresses()->latest('id')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $address = $request->user()->addresses()->create($this->validated($request));
        $this->ensureSingleDefault($request, $address);

        return response()->json(['data' => $address->refresh()], 201);
    }

    public function update(Request $request, Address $address): JsonResponse
    {
        abort_unless($address->user_id === $request->user()->id, 404);

        $address->update($this->validated($request));
        $this->ensureSingleDefault($request, $address);

        return response()->json(['data' => $address->refresh()]);
    }

    public function destroy(Request $request, Address $address): JsonResponse
    {
        abort_unless($address->user_id === $request->user()->id, 404);
        $address->delete();

        return response()->json(['message' => __('Address removed.')]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function validated(Request $request): array
    {
        $request->merge([
            'country' => strtoupper(substr((string) $request->input('country', 'IN'), 0, 2)),
            'phone' => $request->filled('phone') ? $request->input('phone') : null,
        ]);

        return $request->validate([
            'name' => ['required', 'string', 'max:80', 'regex:/^[\\p{L}\\s.\'-]+$/u'],
            'phone' => ['nullable', 'string', 'max:20', 'regex:/^[+]?[\\d\\s()-]{8,20}$/'],
            'line1' => ['required', 'string', 'max:255'],
            'line2' => ['nullable', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:120'],
            'region' => ['nullable', 'string', 'max:120'],
            'postal_code' => ['required', 'string', 'max:12', 'regex:/^[A-Za-z0-9\\s-]{3,12}$/'],
            'country' => ['required', 'string', 'size:2', 'regex:/^[A-Z]{2}$/'],
            'is_default' => ['sometimes', 'boolean'],
        ]);
    }

    protected function ensureSingleDefault(Request $request, Address $address): void
    {
        if (! $address->is_default) {
            return;
        }

        $request->user()->addresses()->whereKeyNot($address->id)->update(['is_default' => false]);
    }
}
