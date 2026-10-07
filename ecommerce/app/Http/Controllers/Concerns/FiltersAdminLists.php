<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Shared helpers for admin list endpoints so every module can offer the same
 * date-range, amount-range and page-size filters (used by the admin UI and its CSV/Excel export).
 */
trait FiltersAdminLists
{
    protected function perPage(Request $request, int $default = 20): int
    {
        return max(1, min($request->integer('per_page', $default), 200));
    }

    /**
     * @param  Builder<*>  $query
     */
    protected function applyDateRange(Builder $query, Request $request, string $column = 'created_at'): void
    {
        $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
        ]);

        if ($from = $request->date('date_from')) {
            $query->where($column, '>=', $from->startOfDay());
        }

        if ($to = $request->date('date_to')) {
            $query->where($column, '<=', $to->endOfDay());
        }
    }

    /**
     * @param  Builder<*>  $query
     */
    protected function applyAmountRange(Builder $query, Request $request, string $column): void
    {
        $request->validate([
            'min_total' => ['nullable', 'numeric', 'min:0'],
            'max_total' => ['nullable', 'numeric', 'min:0'],
        ]);

        if ($request->filled('min_total')) {
            $query->where($column, '>=', $request->input('min_total'));
        }

        if ($request->filled('max_total')) {
            $query->where($column, '<=', $request->input('max_total'));
        }
    }
}
