<?php

namespace Webfolks\CommerceCore\Repositories;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Webfolks\CommerceCore\Commerce;
use Webfolks\CommerceCore\Enums\ProductStatus;
use Webfolks\CommerceCore\Models\Product;

class ProductRepository
{
    /**
     * @param  array{q?: string|null, status?: string|null, sort?: string|null, per_page?: int|null}  $filters
     * @return LengthAwarePaginator<int, Product>
     */
    public function search(array $filters = []): LengthAwarePaginator
    {
        $query = Commerce::query('product')->with(['variants']);

        $this->applySearch($query, $filters['q'] ?? null);
        $this->applyStatus($query, $filters['status'] ?? ProductStatus::Active->value);
        $this->applySort($query, $filters['sort'] ?? 'newest');

        $perPage = (int) ($filters['per_page'] ?? config('commerce.catalog.per_page', 12));

        return $query->paginate(max(1, min($perPage, 48)));
    }

    public function findBySlug(string $slug): Product
    {
        /** @var Product $product */
        $product = Commerce::query('product')
            ->with(['variants'])
            ->where('slug', $slug)
            ->firstOrFail();

        return $product;
    }

    protected function applySearch(Builder $query, ?string $term): void
    {
        $term = is_string($term) ? trim($term) : '';

        if ($term === '') {
            return;
        }

        $like = '%'.$term.'%';

        $query->where(function (Builder $search) use ($like): void {
            $search
                ->where('name', 'like', $like)
                ->orWhere('description', 'like', $like)
                ->orWhereHas('variants', function (Builder $variants) use ($like): void {
                    $variants->where('sku', 'like', $like);
                });
        });
    }

    protected function applyStatus(Builder $query, ?string $status): void
    {
        $case = ProductStatus::tryFrom((string) $status);

        if ($case instanceof ProductStatus) {
            $query->where('status', $case);
        }
    }

    protected function applySort(Builder $query, string $sort): void
    {
        match ($sort) {
            'name' => $query->orderBy('name')->orderBy('id'),
            'oldest' => $query->oldest('id'),
            default => $query->latest('id'),
        };
    }
}
