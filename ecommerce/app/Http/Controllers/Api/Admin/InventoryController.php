<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\FiltersAdminLists;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Webfolks\CommerceCore\Models\ProductVariant;

class InventoryController extends Controller
{
    use FiltersAdminLists;

    public function index(Request $request): JsonResponse
    {
        $query = ProductVariant::query()->with('product:id,name,slug')->latest('id');

        if ($search = $request->string('q')->toString()) {
            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('sku', 'like', '%'.$search.'%')
                    ->orWhereHas('product', fn ($product) => $product->where('name', 'like', '%'.$search.'%'));
            });
        }

        if ($request->string('stock')->toString() === 'low') {
            $query->where('stock', '>', 0)->where('stock', '<=', 5);
        }

        if ($request->string('stock')->toString() === 'out') {
            $query->where('stock', '<=', 0);
        }

        return response()->json($query->paginate($this->perPage($request, 30)));
    }

    public function adjust(Request $request, ProductVariant $variant): JsonResponse
    {
        $validated = $request->validate([
            'stock' => ['required', 'integer', 'min:0'],
        ]);

        $variant->forceFill(['stock' => $validated['stock']])->save();

        return response()->json(['data' => $variant->refresh()->load('product:id,name,slug')]);
    }
}
