import { Link } from 'react-router-dom';
import { categoryDemoImage } from '../../demoImages.js';
import { Button } from '../common.jsx';
import { Icon } from '../icons.jsx';

export function PromoStrip() {
    return (
        <Link
            to="/shop"
            className="flex flex-col items-center justify-between gap-2 rounded-2xl bg-ink px-5 py-3 text-center text-sm text-paper sm:flex-row sm:text-left"
        >
            <span className="inline-flex items-center gap-2">
                <Icon name="sparkles" className="h-4 w-4 text-accent" />
                <span><strong className="font-medium">WELCOME10</strong> — 10% off your first order at checkout.</span>
            </span>
            <span className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.14em] text-white/70">
                Shop now <Icon name="arrow-right" className="h-3.5 w-3.5" />
            </span>
        </Link>
    );
}

export function CampaignBanners({ home, categories = [] }) {
    const arrival = home?.new_arrivals?.[1] ?? home?.new_arrivals?.[0];
    const trending = home?.trending?.[0];
    const category = categories[0];

    const banners = [
        {
            key: 'new',
            eyebrow: 'Just in',
            title: 'New arrivals',
            body: 'Fresh linen and knitwear from the live catalogue.',
            to: '/shop?sort=newest',
            cta: 'See what’s new',
            image: arrival?.image_url,
            tone: 'bg-forest',
        },
        {
            key: 'cod',
            eyebrow: category?.name || 'Easy checkout',
            title: category ? `Shop ${category.name}` : 'Pay on delivery',
            body: category
                ? `${category.products_count || 'Live'} pieces, ready for the bag.`
                : 'Place the order now and pay when it arrives.',
            to: category ? `/shop?category=${category.slug}` : '/shop',
            cta: category ? `Browse ${category.name}` : 'Start shopping',
            image: categoryDemoImage(category) || trending?.image_url,
            tone: 'bg-accent-dark',
        },
    ];

    return (
        <section className="grid gap-4 md:grid-cols-2">
            {banners.map((banner) => (
                <Link
                    key={banner.key}
                    to={banner.to}
                    className={`group relative isolate min-h-[16rem] overflow-hidden rounded-3xl ${banner.tone} text-paper shadow-soft`}
                >
                    {banner.image && (
                        <img
                            src={banner.image}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/45 to-ink/10" />
                    <div className="relative flex h-full flex-col justify-end p-6 sm:p-8">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-white/70">{banner.eyebrow}</p>
                        <h2 className="mt-1 font-display text-3xl">{banner.title}</h2>
                        <p className="mt-2 max-w-xs text-sm leading-6 text-white/80">{banner.body}</p>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
                            {banner.cta}
                            <Icon name="arrow-right" className="h-4 w-4 transition group-hover:translate-x-0.5" />
                        </span>
                    </div>
                </Link>
            ))}
        </section>
    );
}

export function TrustBanner() {
    const items = [
        ['truck', 'Live stock', 'What you see can go in the bag.'],
        ['lock-closed', 'Secure checkout', 'Payments are confirmed on the server.'],
        ['banknotes', 'Cash on delivery', 'Pay when the order arrives.'],
        ['arrow-path', 'Easy returns window', 'Cancel before fulfilment from your orders.'],
    ];

    return (
        <section className="grid gap-3 rounded-3xl border border-line bg-paper p-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map(([icon, title, body]) => (
                <div key={title} className="flex gap-3 p-2">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-canvas">
                        <Icon name={icon} className="h-5 w-5 text-forest" />
                    </span>
                    <div>
                        <p className="font-medium">{title}</p>
                        <p className="mt-0.5 text-sm leading-5 text-muted">{body}</p>
                    </div>
                </div>
            ))}
        </section>
    );
}

export function SaleBanner({ product }) {
    if (!product) {
        return (
            <section className="overflow-hidden rounded-3xl bg-accent px-6 py-10 text-paper sm:px-10">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/75">The floor</p>
                <h2 className="mt-2 max-w-lg font-display text-4xl leading-tight">Everyday pieces, honest stock, real checkout.</h2>
                <Button as={Link} to="/shop" variant="ghost" className="mt-6 rounded-full border-transparent bg-paper text-ink hover:bg-white">
                    Browse the shop
                </Button>
            </section>
        );
    }

    return (
        <section className="relative isolate overflow-hidden rounded-3xl bg-accent text-paper shadow-soft">
            {product.image_url && (
                <img src={product.image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-accent via-accent/85 to-accent/40" />
            <div className="relative grid gap-6 p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="max-w-lg">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/80">On the floor</p>
                    <h2 className="mt-2 font-display text-4xl leading-tight">{product.name}</h2>
                    <p className="mt-3 text-sm leading-6 text-white/80">
                        In stock and ready for the bag. Add it now, or check out this piece only with Buy now.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Button as={Link} to={`/products/${product.slug}`} variant="ghost" className="rounded-full border-transparent bg-paper text-ink hover:bg-white">
                            View product
                        </Button>
                        <Button as={Link} to="/shop" variant="ghost" className="rounded-full border-white/30 bg-white/10 text-white hover:border-white hover:bg-white/15">
                            Keep browsing
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
