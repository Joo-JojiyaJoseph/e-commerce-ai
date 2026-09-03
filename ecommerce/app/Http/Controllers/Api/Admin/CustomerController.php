<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\User;
use App\Models\Wishlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Webfolks\CommerceCore\Models\Order;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query()->latest('id');

        if ($search = $request->string('q')->toString()) {
            $like = '%'.$search.'%';
            $query->where(function ($builder) use ($like): void {
                $builder->where('name', 'like', $like)->orWhere('email', 'like', $like);
            });
        }

        return response()->json($query->paginate(20));
    }

    public function show(User $customer): JsonResponse
    {
        return response()->json([
            'data' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'email' => $customer->email,
                'created_at' => $customer->created_at,
                'roles' => $customer->getRoleNames(),
                'addresses' => $customer->addresses,
                'orders' => Order::query()->where('user_id', $customer->id)->latest('id')->limit(20)->get(['id', 'number', 'status', 'payment_status', 'total', 'created_at']),
                'reviews' => Review::query()->where('user_id', $customer->id)->latest('id')->limit(20)->get(),
                'wishlist_count' => Wishlist::query()->where('user_id', $customer->id)->count(),
            ],
        ]);
    }
}
