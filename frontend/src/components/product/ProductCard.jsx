import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { friendlyError } from '../../api.js';
import { useCart } from '../../store/cart.jsx';
import { useToast } from '../../toast.jsx';
import { Icon } from '../icons.jsx';
import { Skeleton } from '../common.jsx';
import { ProductPrice, ProductRating } from './ProductMeta.jsx';
import WishlistButton from './WishlistButton.jsx';

export default function ProductCard({ product, index = 0 }) {
    const navigate = useNavigate();
    const { addItem } = useCart();
    const { push } = useToast();
    const [busy, setBusy] = useState(false);
    const [added, setAdded] = useState(false);
    const discount = Number(product.compare_at_price) > Number(product.price)
        ? Math.round((1 - Number(product.price) / Number(product.compare_at_price)) * 100)
        : 0;

    async function addToBag(options = {}) {
        if (!product.variant_id || !product.in_stock) {
            navigate(`/products/${product.slug}`);
            return null;
        }

        setBusy(true);

        try {
            const data = await addItem(product.variant_id, 1, options);
            if (options.openDrawer !== false) {
                setAdded(true);
                window.setTimeout(() => setAdded(false), 1400);
                push({ title: 'Added to cart', message: `${product.name} is in your bag.`, tone: 'success' });
            }
            return data;
        } catch (error) {
            push({ title: 'Could not add to cart', message: friendlyError(error, 'This product is currently unavailable.'), tone: 'error' });
            throw error;
        } finally {
            setBusy(false);
        }
    }

    async function onAdd(event) {
        event.preventDefault();
        event.stopPropagation();
        await addToBag().catch(() => {});
    }

    async function onBuyNow(event) {
        event.preventDefault();
        event.stopPropagation();
        setBusy(true);

        try {
            const data = await addItem(product.variant_id, 1, { openDrawer: false });
            const line = data.items?.find((item) => Number(item.variant?.id) === Number(product.variant_id));
            navigate(line ? `/checkout?buy_now=${line.id}` : '/checkout');
        } catch (error) {
            push({ title: 'Could not buy now', message: friendlyError(error, 'This product is currently unavailable.'), tone: 'error' });
        } finally {
            setBusy(false);
        }
    }

    return (
        <div
            className="product-card-enter h-full"
            style={{ animationDelay: `${Math.min(index, 10) * 55}ms` }}
        >
            <article className="product-card group flex h-full flex-col overflow-hidden rounded-2xl border border-line/80 bg-paper">
                <div className="relative aspect-[4/5] overflow-hidden bg-[#efe7db]">
                    <Link to={`/products/${product.slug}`} className="block h-full" aria-label={product.name}>
                        {product.image_url ? (
                            <>
                                <img
                                    src={product.image_url}
                                    alt=""
                                    loading="lazy"
                                    className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
                                />
                                {product.hover_image_url && (
                                    <img
                                        src={product.hover_image_url}
                                        alt=""
                                        loading="lazy"
                                        className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-700 ease-out group-hover:opacity-100"
                                    />
                                )}
                            </>
                        ) : (
                            <div className="flex h-full items-center justify-center font-display text-5xl text-[#d4c8b6]">
                                {product.name.slice(0, 1)}
                            </div>
                        )}
                    </Link>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink/35 to-transparent opacity-80 transition duration-300 group-hover:opacity-100" />

                    {discount > 0 && product.in_stock && (
                        <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-white shadow-soft">
                            {discount}% off
                        </span>
                    )}
                    {!product.in_stock && (
                        <span className="absolute left-3 top-3 rounded-full bg-paper/95 px-2.5 py-1 text-[11px] font-medium text-muted shadow-soft">
                            Out of stock
                        </span>
                    )}
                    <WishlistButton product={product} className="absolute right-3 top-3 h-10 w-10 bg-paper/80 backdrop-blur-sm" />

                    <div className="product-card-actions absolute inset-x-3 bottom-3 z-10 flex gap-2">
                        <button
                            type="button"
                            onClick={onAdd}
                            disabled={busy}
                            className="flex-1 rounded-full bg-paper/95 px-3 py-2 text-xs font-medium text-ink shadow-soft backdrop-blur-sm transition hover:bg-white disabled:opacity-50"
                        >
                            {busy && !added ? 'Adding…' : added ? 'Added' : product.in_stock ? 'Add to bag' : 'View'}
                        </button>
                        {product.in_stock && product.variant_id && (
                            <button
                                type="button"
                                onClick={onBuyNow}
                                disabled={busy}
                                className="rounded-full bg-ink px-3 py-2 text-xs font-medium text-white shadow-soft transition hover:bg-black disabled:opacity-50"
                            >
                                Buy now
                            </button>
                        )}
                    </div>
                </div>

                <Link to={`/products/${product.slug}`} className="flex flex-1 flex-col gap-1.5 p-3.5">
                    {product.brand && (
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{product.brand}</p>
                    )}
                    <h3 className="text-sm font-medium leading-snug text-balance transition group-hover:text-accent-dark">
                        {product.name}
                    </h3>
                    <ProductRating value={product.rating_avg} count={product.review_count} compact />
                    <div className="mt-auto pt-1">
                        <ProductPrice price={product.price} compareAt={product.compare_at_price} />
                    </div>
                </Link>
            </article>
        </div>
    );
}

export function ProductCardSkeleton() {
    return (
        <div className="overflow-hidden rounded-2xl border border-line bg-paper">
            <Skeleton className="aspect-[4/5] rounded-none" />
            <div className="space-y-2 p-3.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-24" />
            </div>
        </div>
    );
}

export function ProductGrid({ products }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
            ))}
        </div>
    );
}

export function ProductRail({ title, subtitle, products, href = '/shop' }) {
    if (!products?.length) {
        return null;
    }

    return (
        <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="font-display text-3xl md:text-4xl">{title}</h2>
                    {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
                </div>
                <Link to={href} className="inline-flex items-center gap-1 text-sm font-medium transition-[gap] duration-200 hover:gap-2">
                    View all
                    <Icon name="arrow-right" className="h-4 w-4" />
                </Link>
            </div>
            <ProductGrid products={products} />
        </section>
    );
}

export function ProductGridSkeleton({ count = 4 }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: count }, (_, index) => (
                <ProductCardSkeleton key={index} />
            ))}
        </div>
    );
}
