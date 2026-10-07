import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createReview, friendlyError, getProduct, getReviews, money } from '../api.js';
import { Button, ErrorState, Input, Select, Skeleton, Textarea } from '../components/common.jsx';
import { ProductPrice, ProductRating } from '../components/product/ProductMeta.jsx';
import ModelViewer from '../components/ModelViewer.jsx';
import TryOn from '../components/TryOn.jsx';
import WishlistButton from '../components/product/WishlistButton.jsx';
import { Icon } from '../components/icons.jsx';
import { buildCategoryOptions } from '../categoryTree.js';
import { useCatalog } from '../store/catalog.jsx';
import { useStorefrontConfig } from '../store/storefrontConfig.js';
import { useAuth } from '../auth.jsx';
import { useCart } from '../store/cart.jsx';
import { useToast } from '../toast.jsx';
import { flattenErrors, hasErrors, maxLen, minLen, pick, required } from '../validate.js';

export default function Product() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addItem } = useCart();
    const { push } = useToast();
    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [variantId, setVariantId] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [error, setError] = useState(null);
    const [review, setReview] = useState({ rating: 5, title: '', body: '' });
    const [reviewErrors, setReviewErrors] = useState({});
    const [activeImage, setActiveImage] = useState(0);
    const [adding, setAdding] = useState(false);
    const [view, setView] = useState('photos');
    const [searchParams] = useSearchParams();
    const wantedView = searchParams.get('view');
    const { allCategories } = useCatalog();
    const storeConfig = useStorefrontConfig();
    const [reviewing, setReviewing] = useState(false);

    useEffect(() => {
        if (!slug) {
            return;
        }

        getProduct(slug)
            .then(({ data }) => {
                setProduct(data);
                setVariantId(data.variants[0]?.id ?? null);
                setActiveImage(0);
            })
            .catch((caught) => setError(caught.message));

        getReviews(slug)
            .then((response) => setReviews(response.data ?? []))
            .catch(() => setReviews([]));
    }, [slug]);

    const variant = useMemo(
        () => product?.variants.find((item) => item.id === variantId) ?? product?.variants[0],
        [product, variantId],
    );
    const images = (product?.images ?? []).map((image) => (typeof image === 'string' ? { url: image, variant_id: null } : image));
    const visibleImages = images.filter((image) => !image.variant_id || image.variant_id === variant?.id);
    const gallery = visibleImages.length ? visibleImages : images;

    async function addToCart(options = {}) {
        if (!variant) {
            return null;
        }

        setAdding(true);

        try {
            const data = await addItem(variant.id, quantity, options);
            if (options.openDrawer !== false) {
                push({ title: 'Added to cart', message: `${product.name} is in your bag.`, tone: 'success' });
            }
            return data;
        } catch (caught) {
            push({ title: 'Could not add to cart', message: friendlyError(caught, 'This product is currently unavailable.'), tone: 'error' });
            throw caught;
        } finally {
            setAdding(false);
        }
    }

    async function buyNow() {
        const data = await addToCart({ openDrawer: false });
        const line = data?.items?.find((item) => Number(item.variant?.id) === Number(variant.id));
        navigate(line ? `/checkout?buy_now=${line.id}` : '/checkout');
    }

    if (error && !product) {
        return <ErrorState title="Product unavailable" body={error} />;
    }

    // Deep links: ?view=ar (from the QR code) or ?view=tryon open straight onto that tab.
    useEffect(() => {
        if (!product) return;
        if (wantedView === 'ar' && product.model_url) setView('3d');
        else if (wantedView === 'tryon' && product.tryon_url) setView('tryon');
    }, [product, wantedView]);

    if (!product) {
        return <Skeleton className="h-96" />;
    }

    // Breadcrumb follows the product's deepest category up through its parents (e.g. Knitwear / Sweaters).
    const categoryPath = (() => {
        const tree = buildCategoryOptions(allCategories);
        const owned = tree.filter((node) => (product.categories ?? []).some((category) => category.slug === node.slug));
        const deepest = owned.sort((a, b) => b.depth - a.depth)[0];
        if (!deepest) return product.categories?.[0] ? [product.categories[0]] : [];
        const byId = new Map(tree.map((node) => [node.id, node]));
        const chain = [];
        for (let node = deepest, guard = 0; node && guard < 10; node = byId.get(node.parent_id), guard += 1) chain.unshift(node);
        return chain;
    })();

    const pageUrl = typeof window === 'undefined' ? '' : window.location.href;
    const shareText = `${product.name} – ${pageUrl}`;
    const whatsappNumber = storeConfig.whatsapp_number;
    const has3d = Boolean(product.model_url);
    const hasTryOn = Boolean(product.tryon_url);
    const tabs = [['photos', 'Photos', 'photo'], has3d && ['3d', '3D & AR', 'cube3d'], hasTryOn && ['tryon', 'Try on', 'user']].filter(Boolean);
    const activeView = (view === '3d' && has3d) || (view === 'tryon' && hasTryOn) ? view : 'photos';
    // The link a phone opens when the QR code is scanned: this product, straight on its 3D & AR view.
    const arLink = typeof window === 'undefined' ? '' : `${window.location.origin}${window.location.pathname}?view=ar`;

    return (
        <div className="space-y-12">
            <nav className="text-sm text-muted">
                <Link to="/shop">Shop</Link>
                {categoryPath.map((category) => (
                    <span key={category.id}>
                        <span> / </span>
                        <Link to={`/shop?category=${category.slug}`}>{category.name}</Link>
                    </span>
                ))}
                <span> / {product.name}</span>
            </nav>
            <div className="grid gap-10 lg:grid-cols-2">
                <div>
                    {tabs.length > 1 && (
                        <div className="mb-3 inline-flex rounded-full border border-white/70 bg-white/60 p-1 backdrop-blur" role="tablist" aria-label="Product view">
                            {tabs.map(([key, label, icon]) => (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeView === key}
                                    onClick={() => setView(key)}
                                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${activeView === key ? 'bg-accent text-white shadow-[0_6px_16px_-4px_rgb(109_74_255_/_0.6)]' : 'text-muted hover:text-ink'}`}
                                >
                                    <Icon name={icon} className="h-4 w-4" /> {label}
                                </button>
                            ))}
                        </div>
                    )}
                    {activeView === '3d' ? (
                        <ModelViewer
                            src={product.model_url}
                            iosSrc={product.model_ios_url}
                            poster={product.image_url}
                            alt={`3D model of ${product.name}`}
                            className="aspect-square"
                            placement={product.ar_placement}
                            dimensions={product}
                            qrUrl={arLink}
                        />
                    ) : activeView === 'tryon' ? (
                        <TryOn garmentUrl={product.tryon_url} type={product.tryon_type ?? 'top'} name={product.name} />
                    ) : (
                    <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/50 shadow-soft">
                        {gallery[activeImage]?.url ? (
                            <img src={gallery[activeImage].url} alt={gallery[activeImage].alt_text || product.name} className="aspect-square w-full object-cover" />
                        ) : product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="aspect-square w-full object-cover" />
                        ) : (
                            <div className="flex aspect-square items-center justify-center font-display text-7xl text-accent/30">{product.name.slice(0, 1)}</div>
                        )}
                    </div>
                    )}
                    {gallery.length > 1 && activeView === 'photos' && (
                        <div className="mt-3 flex gap-2 overflow-x-auto">
                            {gallery.map((image, index) => (
                                <button key={image.id || image.url} type="button" className={`h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 transition ${activeImage === index ? 'border-accent' : 'border-transparent opacity-70 hover:opacity-100'}`} onClick={() => setActiveImage(index)}>
                                    <img src={image.url} alt="" className="h-full w-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            {product.brand && <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{product.brand.name}</p>}
                            <h1 className="mt-2 font-display text-4xl">{product.name}</h1>
                        </div>
                        <WishlistButton product={product} size="lg" className="mt-2 h-11 w-11 border border-line" />
                    </div>
                    <div className="mt-3"><ProductRating value={product.rating_avg} count={product.review_count} /></div>
                    <p className="mt-4 text-sm leading-6 text-muted">{product.description}</p>
                    {variant && (
                        <div className="mt-6">
                            <ProductPrice price={variant.price} compareAt={variant.compare_at_price} className="text-2xl" />
                            <p className="mt-2 text-sm text-muted">
                                {variant.stock > 0 ? `${variant.stock} in stock · 3–5 day dispatch` : 'Currently out of stock'}
                            </p>
                        </div>
                    )}
                    <div className="mt-8 space-y-4">
                        {product.variants.length > 1 && (
                            <Select label="Option" value={variantId ?? ''} onChange={(event) => {
                                setVariantId(Number(event.target.value));
                                setActiveImage(0);
                            }}>
                                {product.variants.map((option) => (
                                    <option key={option.id} value={option.id}>{option.sku} — {money(option.price)}</option>
                                ))}
                            </Select>
                        )}
                        <Input id="qty" label="Quantity" type="number" min={1} max={99} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="max-w-32" />
                        <div className="sticky bottom-20 z-20 flex flex-col gap-2 py-3 md:static md:flex-row">
                            <Button type="button" disabled={!variant || variant.stock < 1} loading={adding} loadingLabel="Adding to cart…" onClick={() => addToCart().catch(() => {})} className="flex-1 rounded-full">
                                Add to cart
                            </Button>
                            <Button type="button" variant="accent" disabled={!variant || variant.stock < 1 || adding} onClick={() => buyNow().catch(() => {})} className="flex-1 rounded-full">
                                Buy now
                            </Button>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
                        <a
                            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/70 bg-white/60 px-4 py-2 font-medium backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
                        >
                            <Icon name="share" className="h-4 w-4 text-[#128C7E]" /> Share on WhatsApp
                        </a>
                        {whatsappNumber && (
                            <a
                                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi, I have a question about ${product.name} (${pageUrl})`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 font-semibold text-white shadow-[0_8px_20px_-6px_rgb(37_211_102_/_0.7)] transition hover:-translate-y-0.5"
                            >
                                <Icon name="chat-bubble" className="h-4 w-4" /> Ask us on WhatsApp
                            </a>
                        )}
                    </div>
                    <div className="mt-8 grid gap-2 text-sm text-muted sm:grid-cols-3">
                        <p className="rounded-xl border border-line bg-paper px-3 py-2">Unused items can be cancelled before fulfilment.</p>
                        <p className="rounded-xl border border-line bg-paper px-3 py-2">Buy now checks out this piece only.</p>
                        <p className="rounded-xl border border-line bg-paper px-3 py-2">Coupon WELCOME10 at checkout.</p>
                    </div>
                </div>
            </div>
            <section className="grid gap-8 lg:grid-cols-2">
                <div className="rounded-2xl border border-line bg-paper p-6 shadow-soft">
                    <h2 className="font-display text-2xl">Reviews</h2>
                    <div className="mt-4 space-y-4">
                        {reviews.length === 0 && <p className="text-sm text-muted">No reviews yet.</p>}
                        {reviews.map((item) => (
                            <article key={item.id} className="border-t border-line pt-4 text-sm">
                                <p className="font-medium">{item.title || `${item.rating}/5`}</p>
                                <p className="text-muted">{item.user?.name} {item.is_verified ? '· Verified purchase' : ''}</p>
                                {item.body && <p className="mt-1">{item.body}</p>}
                            </article>
                        ))}
                    </div>
                </div>
                <form
                    noValidate
                    className="space-y-3 rounded-2xl border border-line bg-paper p-6 shadow-soft"
                    onSubmit={async (event) => {
                        event.preventDefault();
                        if (!user) {
                            navigate('/login?next=' + encodeURIComponent(`/products/${slug}`));
                            return;
                        }
                        const nextErrors = pick({
                            title: maxLen(review.title, 120, 'Title'),
                            body: required(review.body, 'Review') || minLen(review.body, 10, 'Review') || maxLen(review.body, 2000, 'Review'),
                        });
                        if (hasErrors(nextErrors)) {
                            setReviewErrors(nextErrors);
                            return;
                        }
                        setReviewing(true);
                        setReviewErrors({});
                        try {
                            const { data } = await createReview(slug, {
                                ...review,
                                title: review.title.trim(),
                                body: review.body.trim(),
                            });
                            push({
                                title: 'Review submitted',
                                message: data.status === 'pending'
                                    ? 'Your review has been submitted and is awaiting approval.'
                                    : 'Your review has been saved.',
                                tone: 'success',
                            });
                            setReview({ rating: 5, title: '', body: '' });
                        } catch (caught) {
                            setReviewErrors(flattenErrors(caught.errors));
                            push({ title: 'Could not submit review', message: friendlyError(caught), tone: 'error' });
                        } finally {
                            setReviewing(false);
                        }
                    }}
                >
                    <h2 className="font-display text-2xl">Write a review</h2>
                    <Select label="Rating" value={review.rating} onChange={(event) => setReview((current) => ({ ...current, rating: Number(event.target.value) }))}>
                        {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
                    </Select>
                    <Input label="Title (optional)" maxLength={120} value={review.title} error={reviewErrors.title} onChange={(event) => setReview((current) => ({ ...current, title: event.target.value }))} />
                    <Textarea label="Your review" required maxLength={2000} hint="At least 10 characters." value={review.body} error={reviewErrors.body} onChange={(event) => setReview((current) => ({ ...current, body: event.target.value }))} />
                    <Button type="submit" loading={reviewing} loadingLabel="Submitting review…">Submit review</Button>
                </form>
            </section>
        </div>
    );
}
