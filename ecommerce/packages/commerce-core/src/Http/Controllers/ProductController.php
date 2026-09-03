<?php

namespace Webfolks\CommerceCore\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Webfolks\CommerceCore\Http\Resources\ProductResource;
use Webfolks\CommerceCore\Repositories\ProductRepository;

class ProductController
{
    public function __construct(protected ProductRepository $products) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return ProductResource::collection($this->products->search([
            'q' => $request->string('q')->toString() ?: null,
            'status' => $request->string('status')->toString() ?: null,
            'sort' => $request->string('sort')->toString() ?: 'newest',
            'per_page' => $request->integer('per_page') ?: null,
        ]));
    }

    public function show(string $product): ProductResource
    {
        return new ProductResource($this->products->findBySlug($product));
    }
}
