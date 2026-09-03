<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryCardResource;
use App\Http\Resources\ProductCardResource;
use App\Http\Resources\ProductDetailResource;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\RecentlyViewedProduct;
use App\Repositories\CatalogRepository;
use App\Support\DemoCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Cache;
use Webfolks\CommerceCore\Enums\ProductStatus;

class CatalogController extends Controller
{
    public function __construct(protected CatalogRepository $catalog) {}

    public function home(Request $request): JsonResponse
    {
        $payload = $this->catalog->homepage();

        return response()->json([
            'data' => [
                'categories' => $this->storefrontCategories(),
                'brands' => $this->storefrontBrands(),
                'new_arrivals' => ProductCardResource::collection($payload['new_arrivals'])->resolve(),
                'trending' => ProductCardResource::collection($payload['trending'])->resolve(),
                'recently_viewed' => $request->user()
                    ? $this->recentProductCards((int) $request->user()->id)
                    : [],
            ],
        ]);
    }

    public function products(Request $request): AnonymousResourceCollection
    {
        return ProductCardResource::collection($this->catalog->search($request->only([
            'q', 'category', 'brand', 'min_price', 'max_price', 'in_stock', 'rating', 'on_sale', 'sort', 'per_page',
        ])));
    }

    public function suggest(Request $request): JsonResponse
    {
        $term = trim((string) $request->query('q', ''));
        $payload = $this->catalog->suggest($term);

        return response()->json([
            'data' => [
                'query' => $term,
                'products' => ProductCardResource::collection($payload['products'])->resolve(),
                'categories' => $payload['categories'],
                'brands' => $payload['brands'],
            ],
        ]);
    }

    public function show(Request $request, string $product): ProductDetailResource
    {
        $model = $this->catalog->findBySlug($product);
        $this->recordView($request, $model->id);

        return new ProductDetailResource($model);
    }

    public function categories(): JsonResponse
    {
        return response()->json([
            'data' => $this->storefrontCategories(),
        ]);
    }

    public function brands(): JsonResponse
    {
        return response()->json([
            'data' => $this->storefrontBrands(),
        ]);
    }

    public function recentlyViewed(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->recentProductCards((int) $request->user()->id),
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function storefrontBrands(): array
    {
        return Cache::remember('commerce.brands', 300, function () {
            return Brand::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'slug', 'logo_url'])
                ->map(fn (Brand $brand): array => [
                    'id' => $brand->id,
                    'name' => $brand->name,
                    'slug' => $brand->slug,
                    'logo_url' => DemoCatalog::brandImage($brand->slug, $brand->logo_url),
                ])
                ->all();
        });
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function storefrontCategories(): array
    {
        return Cache::remember('commerce.categories', 300, function () {
            $categories = Category::query()
                ->active()
                ->withCount(['products as products_count' => fn ($query) => $query->where('products.status', ProductStatus::Active)])
                ->get(['id', 'name', 'slug', 'image_url']);

            foreach ($categories as $category) {
                $image = DemoCatalog::categoryImage($category->slug, $category->image_url);

                if (blank($image)) {
                    $product = $category->products()
                        ->where('products.status', ProductStatus::Active)
                        ->with('images')
                        ->first();

                    $images = $product?->images;
                    $stored = $images?->firstWhere('is_primary', true) ?? $images?->first();
                    $image = $stored?->url() ?? $product?->image_url;
                }

                $category->setAttribute('image_url', $image);
            }

            return CategoryCardResource::collection($categories)->resolve();
        });
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function recentProductCards(int $userId): array
    {
        $ids = RecentlyViewedProduct::query()
            ->where('user_id', $userId)
            ->orderByDesc('viewed_at')
            ->limit(12)
            ->pluck('product_id');

        $products = Product::query()
            ->whereIn('id', $ids)
            ->with(['variants', 'brand', 'images'])
            ->withAvg('approvedReviews as rating_avg', 'rating')
            ->withCount('approvedReviews as reviews_count')
            ->get()
            ->sortBy(fn ($product) => $ids->search($product->id))
            ->values();

        return ProductCardResource::collection($products)->resolve();
    }

    protected function recordView(Request $request, int $productId): void
    {
        $userId = $request->user()?->id;

        if (! $userId) {
            return;
        }

        RecentlyViewedProduct::query()->updateOrCreate(
            ['user_id' => $userId, 'product_id' => $productId],
            ['viewed_at' => now()],
        );
    }
}
