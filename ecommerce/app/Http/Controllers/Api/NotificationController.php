<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotificationPreference;
use App\Models\StoreNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $type = $request->string('type')->toString();

        $query = StoreNotification::query()
            ->where('user_id', $request->user()->id)
            ->latest('id');

        if ($request->boolean('unread')) {
            $query->where('is_read', false);
        }

        if ($type !== '' && $type !== 'all') {
            $query->where('type', 'like', $type.'.%');
        }

        return response()->json($query->paginate(20));
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = StoreNotification::query()
            ->where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->count();

        return response()->json(['data' => ['count' => $count]]);
    }

    public function read(Request $request, StoreNotification $notification): JsonResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 403);

        $notification->forceFill([
            'is_read' => true,
            'read_at' => $notification->read_at ?? now(),
        ])->save();

        return response()->json(['data' => $notification->refresh()]);
    }

    public function readAll(Request $request): JsonResponse
    {
        StoreNotification::query()
            ->where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    public function clearRead(Request $request): JsonResponse
    {
        $deleted = StoreNotification::query()
            ->where('user_id', $request->user()->id)
            ->where('is_read', true)
            ->delete();

        return response()->json([
            'message' => $deleted
                ? 'Read notifications were cleared.'
                : 'There were no read notifications to clear.',
            'data' => ['deleted' => $deleted],
        ]);
    }

    public function destroy(Request $request, StoreNotification $notification): JsonResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 403);

        $notification->delete();

        return response()->json(['message' => 'Notification removed.']);
    }

    public function preferences(Request $request): JsonResponse
    {
        $preferences = NotificationPreference::query()->firstOrCreate(
            ['user_id' => $request->user()->id],
            ['orders' => true, 'payments' => true, 'reviews' => true, 'offers' => true, 'security' => true],
        );

        return response()->json(['data' => $preferences]);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'offers' => ['required', 'boolean'],
        ]);

        $preferences = NotificationPreference::query()->firstOrCreate(
            ['user_id' => $request->user()->id],
            ['orders' => true, 'payments' => true, 'reviews' => true, 'offers' => true, 'security' => true],
        );

        $preferences->forceFill([
            'offers' => $validated['offers'],
            'orders' => true,
            'payments' => true,
            'reviews' => true,
            'security' => true,
        ])->save();

        return response()->json(['data' => $preferences->refresh()]);
    }
}
