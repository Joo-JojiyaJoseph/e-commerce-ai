<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Review::query()->with(['user:id,name,email', 'product:id,name,slug'])->latest('id');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($search = $request->string('q')->toString()) {
            $query->where(function ($builder) use ($search): void {
                $builder->where('title', 'like', '%'.$search.'%')->orWhere('body', 'like', '%'.$search.'%');
            });
        }

        return response()->json($query->paginate(20));
    }

    public function show(Review $review): JsonResponse
    {
        return response()->json([
            'data' => $review->load(['user:id,name,email', 'product:id,name,slug']),
        ]);
    }

    public function approve(Review $review, NotificationService $notifications): JsonResponse
    {
        $review->forceFill(['status' => 'approved'])->save();
        $this->notify($review, $notifications, 'review.approved', 'Your review has been approved and is now visible.');

        return response()->json(['data' => $review->refresh()]);
    }

    public function reject(Review $review, NotificationService $notifications): JsonResponse
    {
        $review->forceFill(['status' => 'rejected'])->save();
        $this->notify($review, $notifications, 'review.rejected', 'Your review was not approved.');

        return response()->json(['data' => $review->refresh()]);
    }

    public function destroy(Review $review): JsonResponse
    {
        $review->delete();

        return response()->json(['message' => 'Review removed.']);
    }

    protected function notify(Review $review, NotificationService $notifications, string $type, string $message): void
    {
        $user = User::query()->find($review->user_id);

        if (! $user) {
            return;
        }

        $product = $review->product;

        $notifications->send(
            $user,
            $type,
            $type === 'review.approved' ? 'Review approved' : 'Review not approved',
            $message,
            $product ? '/products/'.$product->slug : '/account/reviews',
            ['review_id' => $review->id, 'product_id' => $review->product_id],
        );
    }
}
