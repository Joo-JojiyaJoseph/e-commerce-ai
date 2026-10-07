<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\FiltersAdminLists;
use App\Http\Controllers\Controller;
use App\Models\StoreNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    use FiltersAdminLists;

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

        $this->applyDateRange($query, $request);

        return response()->json($query->paginate($this->perPage($request, 30)));
    }
}
