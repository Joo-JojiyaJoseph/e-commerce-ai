<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Review;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Webfolks\CommerceCore\Enums\PaymentStatus;
use Webfolks\CommerceCore\Models\OrderItem;

class ReviewController extends Controller
{
    public function index(string $product): JsonResponse
    {
        $model = Product::query()->where('slug', $product)->firstOrFail();

        $reviews = $model->reviews()
            ->approved()
            ->with('user:id,name')
            ->latest('id')
            ->paginate(10);

        return response()->json($reviews);
    }

    public function store(Request $request, string $product): JsonResponse
    {
        $model = Product::query()->where('slug', $product)->firstOrFail();

        $validated = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'title' => ['nullable', 'string', 'max:120'],
            'body' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $verified = OrderItem::query()
            ->whereHas('order', fn ($order) => $order
                ->where('user_id', $request->user()->id)
                ->where('payment_status', PaymentStatus::Completed))
            ->whereHas('variant', fn ($variant) => $variant->where('product_id', $model->id))
            ->exists();

        $review = Review::query()->updateOrCreate(
            ['user_id' => $request->user()->id, 'product_id' => $model->id],
            [...$validated, 'is_verified' => $verified, 'status' => 'pending'],
        );

        app(NotificationService::class)->send(
            $request->user(),
            'review.submitted',
            'Review submitted',
            'Your review has been submitted and is awaiting approval.',
            '/products/'.$model->slug,
            ['review_id' => $review->id, 'product_id' => $model->id],
        );

        return response()->json([
            'data' => $review->load('user:id,name'),
            'message' => 'Your review has been submitted and is awaiting approval.',
        ], 201);
    }
}
