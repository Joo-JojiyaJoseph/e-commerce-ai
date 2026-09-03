<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductCardResource;
use App\Models\Product;
use App\Models\Wishlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $products = Product::query()
            ->whereIn('id', $request->user()->wishlists()->pluck('product_id'))
            ->with(['variants', 'brand', 'images'])
            ->withAvg('reviews as rating_avg', 'rating')
            ->withCount('reviews')
            ->latest('id')
            ->get();

        return response()->json([
            'data' => ProductCardResource::collection($products)->resolve(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
        ]);

        $request->user()->wishlists()->firstOrCreate([
            'product_id' => $validated['product_id'],
        ]);

        return response()->json(['message' => __('Saved to wishlist.')], 201);
    }

    public function destroy(Request $request, int $product): JsonResponse
    {
        Wishlist::query()
            ->where('user_id', $request->user()->id)
            ->where('product_id', $product)
            ->delete();

        return response()->json(['message' => __('Removed from wishlist.')]);
    }
}
