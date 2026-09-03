import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listProducts } from '../api.js';
import { Button, Drawer, EmptyState, ErrorState, Select } from '../components/common.jsx';
import { FilterChips, FilterPanel, filtersFromSearch } from '../components/filters/FilterPanel.jsx';
import { ProductGrid, ProductGridSkeleton } from '../components/product/ProductCard.jsx';
import { useCatalog } from '../store/catalog.jsx';

export default function Shop() {
    const [params, setParams] = useSearchParams();
    const { categories, brands } = useCatalog();
    const [products, setProducts] = useState([]);
    const [meta, setMeta] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const filters = filtersFromSearch(params);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        listProducts(filters, controller.signal)
            .then((response) => {
                setProducts(response.data);
                setMeta(response.meta);
                setError(null);
            })
            .catch((caught) => {
                if (caught.name !== 'AbortError') {
                    setError(caught.message);
                }
            })
            .finally(() => setLoading(false));

        return () => controller.abort();
    }, [params.toString()]);

    function update(key, value) {
        const next = new URLSearchParams(params);

        if (value) {
            next.set(key, value);
        } else {
            next.delete(key);
        }

        if (key !== 'page') {
            next.delete('page');
        }

        setParams(next);
    }

    function clear() {
        setParams(filters.q ? { q: filters.q } : {});
    }

    return (
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
            <aside className="hidden h-fit rounded-2xl border border-line bg-paper p-5 shadow-soft lg:block">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Catalogue</p>
                <h1 className="mb-4 font-display text-3xl">Shop</h1>
                <FilterPanel filters={filters} categories={categories} brands={brands} onChange={update} onClear={clear} />
            </aside>
            <div>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted">{filters.q ? `Results for “${filters.q}”` : 'Catalogue'}</p>
                        <h1 className="font-display text-3xl lg:hidden">Shop</h1>
                        {meta && <p className="mt-1 text-sm text-muted">{meta.total} products</p>}
                    </div>
                    <div className="flex gap-2">
                <Button type="button" variant="ghost" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
                    Filters
                </Button>
                        <Select value={filters.sort} onChange={(event) => update('sort', event.target.value)}>
                            <option value="newest">Newest</option>
                            <option value="price_asc">Price: low to high</option>
                            <option value="price_desc">Price: high to low</option>
                            <option value="rating">Highest rated</option>
                            <option value="reviewed">Most reviewed</option>
                            <option value="name">Name</option>
                        </Select>
                    </div>
                </div>
                <FilterChips filters={filters} onRemove={(key) => update(key, '')} />
                {error && (
                    <div className="mt-6">
                        <ErrorState body={error} onRetry={() => update('page', filters.page)} />
                    </div>
                )}
                {loading ? (
                    <div className="mt-6">
                        <ProductGridSkeleton count={8} />
                    </div>
                ) : products.length === 0 ? (
                    <div className="mt-6">
                        <EmptyState
                            title="No products match"
                            body="Clear a filter or browse the full floor."
                            action={<Button as={Link} to="/shop">View all</Button>}
                        />
                    </div>
                ) : (
                    <div className="mt-6">
                        <ProductGrid products={products} />
                    </div>
                )}
                {meta?.last_page > 1 && (
                    <div className="mt-8 flex justify-center gap-2">
                        {Array.from({ length: meta.last_page }, (_, index) => index + 1).map((page) => (
                            <button
                                key={page}
                                type="button"
                                className={`h-9 w-9 rounded-full text-sm ${Number(meta.current_page) === page ? 'bg-ink text-white' : 'border border-line bg-paper'}`}
                                onClick={() => update('page', String(page))}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <Drawer open={filtersOpen} title="Filters" onClose={() => setFiltersOpen(false)}>
                <FilterPanel
                    filters={filters}
                    categories={categories}
                    brands={brands}
                    onChange={update}
                    onClear={() => { clear(); setFiltersOpen(false); }}
                    onApply={() => setFiltersOpen(false)}
                />
            </Drawer>
        </div>
    );
}
