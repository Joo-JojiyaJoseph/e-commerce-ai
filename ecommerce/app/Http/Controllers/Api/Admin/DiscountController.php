<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\FiltersAdminLists;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Webfolks\CommerceCore\Enums\DiscountType;
use Webfolks\CommerceCore\Models\Discount;

class DiscountController extends Controller
{
    use FiltersAdminLists;

    public function index(Request $request): JsonResponse
    {
        $query = Discount::query()->latest('id');

        if ($search = $request->string('q')->toString()) {
            $query->where(function ($builder) use ($search): void {
                $builder->where('code', 'like', '%'.$search.'%')->orWhere('name', 'like', '%'.$search.'%');
            });
        }

        if ($request->filled('type')) {
            $query->where('type', $request->string('type')->toString());
        }

        if ($request->filled('active')) {
            $query->where('is_active', $request->boolean('active'));
        }

        $this->applyDateRange($query, $request);

        return response()->json($query->paginate($this->perPage($request)));
    }

    public function show(Discount $discount): JsonResponse
    {
        return response()->json(['data' => $discount]);
    }

    public function store(Request $request): JsonResponse
    {
        $discount = Discount::query()->create($this->rules($request));

        return response()->json(['data' => $discount], 201);
    }

    public function update(Request $request, Discount $discount): JsonResponse
    {
        $discount->fill($this->rules($request, $discount->id))->save();

        return response()->json(['data' => $discount->refresh()]);
    }

    public function destroy(Discount $discount): JsonResponse
    {
        $discount->delete();

        return response()->json(['message' => 'Coupon removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    protected function rules(Request $request, ?int $ignore = null): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:64', Rule::unique('discounts', 'code')->ignore($ignore)],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::enum(DiscountType::class)],
            'value' => ['required', 'numeric', 'min:0'],
            'min_subtotal' => ['nullable', 'numeric', 'min:0'],
            'max_uses' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['required', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ]);
    }
}
