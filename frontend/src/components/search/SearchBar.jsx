import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearSearchHistory, money, readSearchHistory, rememberSearch, suggestProducts } from '../../api.js';
import { useCatalog } from '../../store/catalog.jsx';
import { sanitizeSearch } from '../../validate.js';
import { Icon } from '../icons.jsx';

export default function SearchBar({ compact = false, autoFocus = false, onNavigate }) {
    const navigate = useNavigate();
    const { categories } = useCatalog();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState(readSearchHistory);
    const [results, setResults] = useState({ products: [], categories: [], brands: [] });
    const abortRef = useRef(null);
    const rootRef = useRef(null);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const handle = window.setTimeout(() => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            setLoading(true);
            suggestProducts(query.trim(), controller.signal)
                .then(({ data }) => {
                    setResults(data);
                    setError(null);
                })
                .catch((caught) => {
                    if (caught.name !== 'AbortError') {
                        setError(caught.message ?? 'Search failed.');
                    }
                })
                .finally(() => setLoading(false));
        }, 250);

        return () => window.clearTimeout(handle);
    }, [query, open]);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        function onPointer(event) {
            if (!rootRef.current?.contains(event.target)) {
                setOpen(false);
            }
        }

        document.addEventListener('pointerdown', onPointer);
        return () => document.removeEventListener('pointerdown', onPointer);
    }, [open]);

    function go(term = query) {
        const value = sanitizeSearch(term);
        setHistory(rememberSearch(value));
        setOpen(false);
        onNavigate?.();
        navigate(value ? `/shop?q=${encodeURIComponent(value)}` : '/shop');
    }

    return (
        <div className="relative w-full" ref={rootRef}>
            <label htmlFor={compact ? 'mobile-search' : 'search'} className="sr-only">Search products</label>
            <div className="flex items-center gap-2 rounded-full border border-line bg-canvas/80 px-3.5 transition focus-within:border-ink focus-within:bg-white">
                <Icon name="search" className="h-4 w-4 shrink-0 text-muted" />
                <input
                    id={compact ? 'mobile-search' : 'search'}
                    value={query}
                    autoComplete="off"
                    autoFocus={autoFocus}
                    maxLength={120}
                    placeholder="Search products, brands…"
                    className="search-field w-full border-0 bg-transparent py-2.5 text-sm shadow-none outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none"
                    onFocus={() => setOpen(true)}
                    onChange={(event) => {
                        setQuery(sanitizeSearch(event.target.value));
                        setOpen(true);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            go();
                        }
                        if (event.key === 'Escape') {
                            setOpen(false);
                        }
                    }}
                />
            </div>
            {open && (
                <div className="dropdown-enter absolute z-[60] mt-2 w-full overflow-hidden rounded-xl border border-line bg-paper shadow-soft">
                    {loading && (
                        <div className="space-y-2 px-4 py-3">
                            <p className="text-sm text-muted">Searching…</p>
                            <div className="skeleton h-12 rounded-md" />
                            <div className="skeleton h-12 rounded-md" />
                        </div>
                    )}
                    {error && <p className="px-4 py-3 text-sm text-danger">{error}</p>}
                    {!query && history.length > 0 && (
                        <Section title="Recent searches">
                            {history.map((term) => (
                                <button key={term} type="button" className="block w-full px-4 py-2 text-left text-sm hover:bg-canvas" onClick={() => go(term)}>
                                    {term}
                                </button>
                            ))}
                            <button type="button" className="px-4 py-2 text-xs text-muted" onClick={() => { clearSearchHistory(); setHistory([]); }}>
                                Clear history
                            </button>
                        </Section>
                    )}
                    {!query && categories.length > 0 && (
                        <Section title="Popular">
                            {categories.slice(0, 4).map((category) => (
                                <Link key={category.id} to={`/shop?category=${category.slug}`} className="block px-4 py-2 text-sm hover:bg-canvas" onClick={() => { setOpen(false); onNavigate?.(); }}>
                                    {category.name}
                                </Link>
                            ))}
                        </Section>
                    )}
                    {query && (
                        <>
                            <Section title="Products">
                                {results.products.length === 0 && !loading && <p className="px-4 py-2 text-sm text-muted">No matching products.</p>}
                                {results.products.map((product) => (
                                    <Link key={product.id} to={`/products/${product.slug}`} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-canvas" onClick={() => { rememberSearch(query); setOpen(false); onNavigate?.(); }}>
                                        {product.image_url ? (
                                            <img src={product.image_url} alt="" className="h-12 w-12 rounded-md object-cover" />
                                        ) : (
                                            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-canvas font-display text-muted">{product.name.slice(0, 1)}</span>
                                        )}
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-medium">{product.name}</span>
                                            <span className="text-xs text-muted">{product.brand ? `${product.brand} · ` : ''}{product.price ? money(product.price) : 'See options'}</span>
                                        </span>
                                    </Link>
                                ))}
                            </Section>
                            <Section title="Categories">
                                {results.categories.map((category) => (
                                    <Link key={category.id} to={`/shop?category=${category.slug}`} className="block px-4 py-2 text-sm hover:bg-canvas" onClick={() => { setOpen(false); onNavigate?.(); }}>
                                        {category.name}
                                    </Link>
                                ))}
                            </Section>
                            <Section title="Brands">
                                {results.brands.map((brand) => (
                                    <Link key={brand.id} to={`/shop?brand=${brand.slug}`} className="block px-4 py-2 text-sm hover:bg-canvas" onClick={() => { setOpen(false); onNavigate?.(); }}>
                                        {brand.name}
                                    </Link>
                                ))}
                            </Section>
                            <button type="button" className="w-full border-t border-line px-4 py-3 text-left text-sm font-medium" onClick={() => go()}>
                                View all results for “{query}”
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div className="border-b border-line py-2 last:border-b-0">
            <p className="px-4 pb-1 text-[11px] uppercase tracking-[0.16em] text-muted">{title}</p>
            {children}
        </div>
    );
}
