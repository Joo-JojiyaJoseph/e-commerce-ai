import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState } from '../components/common.jsx';
import { CategoryGrid } from '../components/home/CategoryCard.jsx';
import { CampaignBanners, PromoStrip, SaleBanner, TrustBanner } from '../components/home/HomeBanners.jsx';
import HeroSection, { HeroSkeleton } from '../components/home/HeroSection.jsx';
import { ProductGridSkeleton, ProductRail } from '../components/product/ProductCard.jsx';
import { brandDemoImage } from '../demoImages.js';
import { useCatalog } from '../store/catalog.jsx';

export default function Home() {
    const { home, loadHome, categories, brands } = useCatalog();
    const [error, setError] = useState(null);

    useEffect(() => {
        loadHome().catch((caught) => setError(caught.message));
    }, [loadHome]);

    if (error && !home) {
        return (
            <div className="space-y-12">
                <ErrorState body={error} onRetry={() => { setError(null); loadHome(); }} />
                <CategoryGrid categories={categories} />
            </div>
        );
    }

    const saleProduct = home?.trending?.[1] ?? home?.new_arrivals?.[2] ?? home?.trending?.[0];

    return (
        <div className="space-y-12 md:space-y-16">
            <PromoStrip />
            {home ? <HeroSection home={home} categories={categories} /> : <HeroSkeleton />}
            <TrustBanner />
            <CampaignBanners home={home} categories={categories} />
            <CategoryGrid categories={categories} />

            {home ? (
                <>
                    <ProductRail title="New arrivals" subtitle="Newest pieces from the live catalogue." products={home.new_arrivals} href="/shop?sort=newest" />
                    <SaleBanner product={saleProduct} />
                    <ProductRail title="On the floor" subtitle="Ready for the bag, with real stock." products={home.trending} href="/shop" />
                    <ProductRail title="Recently viewed" products={home.recently_viewed} href="/shop" />
                </>
            ) : (
                <ProductGridSkeleton count={4} />
            )}

            {brands.length > 0 && (
                <section className="rounded-3xl border border-line bg-paper p-6 md:p-8">
                    <div className="mb-5">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Makers</p>
                        <h2 className="font-display text-3xl">Shop by brand</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {brands.map((brand) => {
                            const image = brandDemoImage(brand);

                            return (
                                <Link
                                    key={brand.id}
                                    to={`/shop?brand=${brand.slug}`}
                                    className="group flex items-center gap-3 rounded-2xl border border-line bg-canvas/40 p-2 pr-4 transition hover:border-ink hover:bg-paper"
                                >
                                    {image ? (
                                        <img src={image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                                    ) : (
                                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-canvas font-display text-xl text-muted">
                                            {brand.name?.slice(0, 1) || '?'}
                                        </span>
                                    )}
                                    <span className="font-medium group-hover:underline">{brand.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}
