<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function (Request $request) {
    if ($request->expectsJson()) {
        return response()->json([
            'name' => config('app.name'),
            'api' => url('/api/commerce'),
        ]);
    }

    return view('welcome');
})->name('home');
