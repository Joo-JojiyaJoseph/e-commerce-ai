<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\StoreNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = StoreNotification::query()->with('user:id,name,email')->latest('id');

        if ($type = $request->string('type')->toString()) {
            $query->where('type', 'like', $type.'%');
        }

        if ($search = $request->string('q')->toString()) {
            $query->where(function ($builder) use ($search): void {
                $builder->where('title', 'like', '%'.$search.'%')->orWhere('message', 'like', '%'.$search.'%');
            });
        }

        return response()->json($query->paginate(30));
    }
}
