import { buildCategoryOptions } from '../../categoryTree.js';
import { Button, Select } from '../common.jsx';

export const FILTER_KEYS = ['q', 'category', 'brand', 'min_price', 'max_price', 'in_stock', 'rating', 'on_sale', 'sort', 'page'];

export function filtersFromSearch(searchParams) {
    return {
        q: searchParams.get('q') ?? '',
        category: searchParams.get('category') ?? '',
        brand: searchParams.get('brand') ?? '',
        min_price: searchParams.get('min_price') ?? '',
        max_price: searchParams.get('max_price') ?? '',
        in_stock: searchParams.get('in_stock') ?? '',
        rating: searchParams.get('rating') ?? '',
        on_sale: searchParams.get('on_sale') ?? '',
        sort: searchParams.get('sort') ?? 'newest',
        page: searchParams.get('page') ?? '',
    };
}

export function FilterPanel({ filters, categories, brands, onChange, onClear, onApply }) {
    return (
        <div className="space-y-5">
            <Select label="Category" value={filters.category} onChange={(event) => onChange('category', event.target.value)}>
                <option value="">All categories</option>
                {buildCategoryOptions(categories).map((category) => (
                    <option key={category.id} value={category.slug}>{`${'\u2003'.repeat(category.depth)}${category.depth ? '↳ ' : ''}${category.name}`}</option>
                ))}
            </Select>
            <Select label="Brand" value={filters.brand} onChange={(event) => onChange('brand', event.target.value)}>
                <option value="">All brands</option>
                {brands.map((brand) => (
                    <option key={brand.id} value={brand.slug}>{brand.name}</option>
                ))}
            </Select>
            <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                    <span className="mb-1.5 block font-medium">Min price</span>
                    <input className="w-full rounded-md border border-line px-3 py-2.5 text-sm" value={filters.min_price} onChange={(event) => onChange('min_price', event.target.value)} />
                </label>
                <label className="text-sm">
                    <span className="mb-1.5 block font-medium">Max price</span>
                    <input className="w-full rounded-md border border-line px-3 py-2.5 text-sm" value={filters.max_price} onChange={(event) => onChange('max_price', event.target.value)} />
                </label>
            </div>
            <Select label="Rating" value={filters.rating} onChange={(event) => onChange('rating', event.target.value)}>
                <option value="">Any rating</option>
                <option value="4">4★ and above</option>
                <option value="3">3★ and above</option>
            </Select>
            <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={filters.in_stock === '1'} onChange={(event) => onChange('in_stock', event.target.checked ? '1' : '')} />
                In stock
            </label>
            <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={filters.on_sale === '1'} onChange={(event) => onChange('on_sale', event.target.checked ? '1' : '')} />
                On sale
            </label>
            <div className="flex gap-2">
                <Button type="button" variant="ghost" className="flex-1" onClick={onClear}>Clear</Button>
                {onApply && <Button type="button" className="flex-1" onClick={onApply}>Apply</Button>}
            </div>
        </div>
    );
}

export function FilterChips({ filters, onRemove }) {
    const chips = [
        filters.q && ['q', `“${filters.q}”`],
        filters.category && ['category', filters.category],
        filters.brand && ['brand', filters.brand],
        filters.max_price && ['max_price', `Under ₹${filters.max_price}`],
        filters.min_price && ['min_price', `From ₹${filters.min_price}`],
        filters.rating && ['rating', `${filters.rating}★+`],
        filters.in_stock && ['in_stock', 'In stock'],
        filters.on_sale && ['on_sale', 'On sale'],
    ].filter(Boolean);

    if (chips.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {chips.map(([key, label]) => (
                <button key={key} type="button" className="rounded-full border border-line bg-paper px-3 py-1 text-xs" onClick={() => onRemove(key)}>
                    {label} ×
                </button>
            ))}
        </div>
    );
}
