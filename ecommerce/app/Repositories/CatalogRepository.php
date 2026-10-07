<?php

namespace App\Repositories;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class CatalogRepository
{
    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Product>
     */
    public function search(array $filters = []): LengthAwarePaginator
    {
        $parsed = $this->parseNaturalLanguage(is_string($filters['q'] ?? null) ? $filters['q'] : '');

        $query = Product::query()
            ->active()
            ->with(['variants', 'brand', 'categories', 'images'])
            ->withAvg('approvedReviews as rating_avg', 'rating')
            ->withCount('approvedReviews as reviews_count');

        $this->applySearch($query, $parsed['term']);
        $this->applyCategory($query, $filters['category'] ?? null);
        $this->applyBrand($query, $filters['brand'] ?? null);
        $this->applyPrice($query, $filters['min_price'] ?? $parsed['min_price'], $filters['max_price'] ?? $parsed['max_price']);
        $this->applyAvailability($query, $filters['in_stock'] ?? null);
        $this->applyRating($query, $filters['rating'] ?? null);
        $this->applySale($query, $filters['on_sale'] ?? null);
        $this->applySort($query, is_string($filters['sort'] ?? null) ? $filters['sort'] : 'newest');

        $perPage = (int) ($filters['per_page'] ?? config('commerce.catalog.per_page', 12));

        return $query->paginate(max(1, min($perPage, 48)));
    }

    public function findBySlug(string $slug): Product
    {
        return Product::query()
            ->with(['variants', 'brand', 'categories', 'images'])
            ->withAvg('approvedReviews as rating_avg', 'rating')
            ->withCount('approvedReviews as reviews_count')
            ->where('slug', $slug)
            ->firstOrFail();
    }

    /**
     * @return Collection<int, Product>
     */
    public function latest(int $limit = 8): Collection
    {
        return Product::query()
            ->active()
            ->with(['variants', 'brand', 'images'])
            ->withAvg('approvedReviews as rating_avg', 'rating')
            ->withCount('approvedReviews as reviews_count')
            ->latest('id')
            ->limit($limit)
            ->get();
    }

    /**
     * @return array{term: string, min_price: mixed, max_price: mixed}
     */
    protected function parseNaturalLanguage(string $query): array
    {
        $term = trim($query);
        $max = null;

        if (preg_match('/under\s+(?:₹|rs\.?\s*|\$)?(\d[\d,]*)/i', $term, $match) === 1) {
            $max = str_replace(',', '', $match[1]);
            $term = trim((string) preg_replace('/under\s+(?:₹|rs\.?\s*|\$)?(\d[\d,]*)/i', '', $term));
        }

        $term = trim((string) preg_replace('/\b(best|good|for|with|a|the)\b/i', ' ', $term));
        $term = trim((string) preg_replace('/\s+/', ' ', $term));

        return [
            'term' => $term,
            'min_price' => null,
            'max_price' => $max,
        ];
    }

    /**
     * @param  Builder<Product>  $query
     */
    protected function applySearch(Builder $query, string $term): void
    {
        if ($term === '') {
            return;
        }

        $like = '%'.$term.'%';

        $query->where(function (Builder $search) use ($like): void {
            $search
                ->where('name', 'like', $like)
                ->orWhere('description', 'like', $like)
                ->orWhereHas('variants', fn (Builder $variants) => $variants->where('sku', 'like', $like))
                ->orWhereHas('brand', fn (Builder $brand) => $brand->where('name', 'like', $like));
        });
    }

    /**
     * @param  Builder<Product>  $query
     */
    protected function applyCategory(Builder $query, mixed $category): void
    {
        if (! is_string($category) || $category === '') {
            return;
        }

        $ids = Category::descendantIdsOf(Category::query()->where('slug', $category)->pluck('id')->all());

        $query->whereHas('categories', fn (Builder $categories) => $categories->whereIn('categories.id', $ids));
    }

    /**
     * @param  Builder<Product>  $query
     */
    protected function applyBrand(Builder $query, mixed $brand): void
    {
        if (! is_string($brand) || $brand === '') {
            return;
        }

        $query->whereHas('brand', fn (Builder $brands) => $brands->where('slug', $brand));
    }

    /**
     * @param  Builder<Product>  $query
     */
    protected function applyPrice(Builder $query, mixed $min, mixed $max): void
    {
        if (is_numeric($min)) {
            $query->whereHas('variants', fn (Builder $variants) => $variants->where('price', '>=', $min));
        }

        if (is_numeric($max)) {
            $query->whereHas('variants', fn (Builder $variants) => $variants->where('price', '<=', $max));
        }
    }

    /**
     * @param  Builder<Product>  $query
     */
    protected function applyAvailability(Builder $query, mixed $inStock): void
    {
        if (filter_var($inStock, FILTER_VALIDATE_BOOLEAN)) {
            $query->whereHas('variants', fn (Builder $variants) => $variants->where('stock', '>', 0));
        }
    }

    /**
     * @param  Builder<Product>  $query
     */
    protected function applyRating(Builder $query, mixed $rating): void
    {
        if (! is_numeric($rating) || (float) $rating <= 0) {
            return;
        }

        $query->whereIn('id', Review::query()
            ->where('status', 'approved')
            ->select('product_id')
            ->groupBy('product_id')
            ->havingRaw('AVG(rating) >= ?', [(float) $rating]));
    }

    /**
     * @param  Builder<Product>  $query
     */
    protected function applySale(Builder $query, mixed $onSale): void
    {
        if (! filter_var($onSale, FILTER_VALIDATE_BOOLEAN)) {
            return;
        }

        $query->whereHas('variants', function (Builder $variants): void {
            $variants
                ->whereNotNull('compare_at_price')
                ->whereColumn('compare_at_price', '>', 'price');
        });
    }

    /**
     * @param  Builder<Product>  $query
     */
    protected function applySort(Builder $query, string $sort): void
    {
        match ($sort) {
            'price_asc' => $query->withMin('variants as min_price', 'price')->orderBy('min_price')->orderBy('id'),
            'price_desc' => $query->withMin('variants as min_price', 'price')->orderByDesc('min_price')->orderByDesc('id'),
            'rating' => $query->orderByDesc('rating_avg')->orderByDesc('id'),
            'reviewed' => $query->orderByDesc('reviews_count')->orderByDesc('id'),
            'name' => $query->orderBy('name')->orderBy('id'),
            default => $query->latest('id'),
        };
    }

    /**
     * @return array{products: Collection<int, Product>, categories: Collection<int, Category>, brands: Collection<int, Brand>}
     */
    public function suggest(string $term): array
    {
        $parsed = $this->parseNaturalLanguage($term);
        $needle = $parsed['term'];
        $like = '%'.$needle.'%';

        $products = Product::query()
            ->active()
            ->with(['variants', 'brand', 'images'])
            ->withAvg('approvedReviews as rating_avg', 'rating')
            ->withCount('approvedReviews as reviews_count');

        if ($needle !== '') {
            $this->applySearch($products, $needle);
            $this->applyPrice($products, null, $parsed['max_price']);
        }

        $categories = Category::query()->active();
        $brands = Brand::query()->where('is_active', true)->orderBy('name');

        if ($needle !== '') {
            $categories->where(function (Builder $query) use ($like): void {
                $query->where('name', 'like', $like)->orWhere('slug', 'like', $like);
            });
            $brands->where(function (Builder $query) use ($like): void {
                $query->where('name', 'like', $like)->orWhere('slug', 'like', $like);
            });
        }

        return [
            'products' => $products->latest('id')->limit(6)->get(),
            'categories' => $categories->limit(6)->get(['id', 'name', 'slug']),
            'brands' => $brands->limit(6)->get(['id', 'name', 'slug']),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function homepage(): array
    {
        return Cache::remember('commerce.homepage', 60, function () {
            return [
                'new_arrivals' => $this->latest(8),
                'trending' => $this->latest(8),
            ];
        });
    }
}
