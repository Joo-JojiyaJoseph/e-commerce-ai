import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { money } from '../../api.js';
import { Button, Skeleton } from '../common.jsx';
import { Icon } from '../icons.jsx';

export function HeroSkeleton() {
    return (
        <div className="overflow-hidden rounded-[2rem] border border-line bg-paper">
            <Skeleton className="h-[28rem] w-full rounded-none md:h-[36rem]" />
        </div>
    );
}

export default function HeroSection({ home, categories = [] }) {
    const slides = (home?.new_arrivals ?? []).filter((item) => item.image_url).slice(0, 3);
    const [index, setIndex] = useState(0);
    const featured = slides[index] ?? home?.new_arrivals?.[0];
    const chips = [
        ...categories.slice(0, 3).map((category) => ({
            label: category.name,
            to: `/shop?category=${category.slug}`,
        })),
        { label: 'Under ₹3,000', to: '/shop?q=under%20%E2%82%B93000' },
    ];

    useEffect(() => {
        if (slides.length < 2) {
            return undefined;
        }

        const timer = window.setInterval(() => {
            setIndex((current) => (current + 1) % slides.length);
        }, 6500);

        return () => window.clearInterval(timer);
    }, [slides.length]);

    return (
        <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/40 bg-forest text-paper shadow-[0_30px_80px_-20px_rgb(76_56_180_/_0.55)]">
            <div className="absolute inset-0">
                {featured?.image_url ? (
                    <img
                        key={featured.id ?? featured.slug}
                        src={featured.image_url}
                        alt=""
                        className="hero-media h-full w-full object-cover object-center"
                    />
                ) : (
                    <div className="h-full w-full bg-gradient-to-br from-forest via-[#152e28] to-ink" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-forest via-forest/80 to-forest/20" />
                <div className="orb float-slow -left-20 top-10 h-80 w-80 bg-accent/60" />
                <div className="orb float-slower bottom-0 right-1/4 h-72 w-72 bg-fuchsia-500/40" />
                <div className="orb float-slow -right-10 -top-10 h-64 w-64 bg-sky-400/30" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-ink/20" />
            </div>

            <div className="relative grid min-h-[28rem] items-end gap-8 p-6 sm:p-8 md:min-h-[34rem] md:p-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(16rem,0.7fr)] lg:items-center lg:p-14">
                <div className="max-w-xl space-y-6">
                    <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 shadow-[0_1px_0_rgb(255_255_255_/_0.25)_inset] backdrop-blur-xl">
                        <Icon name="sparkles" className="h-3.5 w-3.5" />
                        {featured ? 'Featured this week' : 'New on the floor'}
                    </p>
                    <div className="space-y-4">
                        <h1 className="font-display text-[2.15rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.6rem]">
                            Clothes you will actually <span className="text-gradient inline-block pr-[0.08em] brightness-150">wear</span>, not just save.
                        </h1>
                        <p className="max-w-md text-sm leading-6 text-white/75 sm:text-[15px]">
                            Live stock, real checkout, and cash on delivery. Start with a category, or jump straight into new arrivals.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button as={Link} to="/shop" variant="accent" className="rounded-full px-5">
                            Shop now
                            <Icon name="arrow-right" className="h-4 w-4" />
                        </Button>
                        <Button as={Link} to="/shop?sort=newest" variant="glass" className="rounded-full">
                            New arrivals
                        </Button>
                    </div>
                    {chips.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1" aria-label="Popular searches">
                            {chips.map((chip) => (
                                <Link
                                    key={chip.to}
                                    to={chip.to}
                                    className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/20 hover:text-white"
                                >
                                    {chip.label}
                                </Link>
                            ))}
                        </div>
                    )}
                    {slides.length > 1 && (
                        <div className="flex gap-2 pt-2" role="tablist" aria-label="Hero banners">
                            {slides.map((slide, slideIndex) => (
                                <button
                                    key={slide.id ?? slide.slug}
                                    type="button"
                                    role="tab"
                                    aria-selected={slideIndex === index}
                                    aria-label={`Show ${slide.name}`}
                                    className={`h-1.5 cursor-pointer rounded-full transition-all duration-500 ${slideIndex === index ? 'w-10 bg-white shadow-[0_0_12px_rgb(255_255_255_/_0.8)]' : 'w-3 bg-white/40 hover:bg-white/70'}`}
                                    onClick={() => setIndex(slideIndex)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {featured && (
                    <Link
                        to={`/products/${featured.slug}`}
                        className="glass-strong float-slow group ml-auto w-full max-w-sm rounded-3xl border border-white/60 p-3.5 text-ink shadow-[0_1px_0_rgb(255_255_255_/_0.9)_inset,0_30px_60px_-15px_rgb(0_0_0_/_0.45)] transition duration-500 hover:scale-[1.03]"
                    >
                        <div className="flex gap-3">
                            <div className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-white/50">
                                {featured.image_url ? (
                                    <img src={featured.image_url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                                ) : (
                                    <div className="flex h-full items-center justify-center font-display text-2xl text-muted">
                                        {featured.name.slice(0, 1)}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1 py-0.5">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Featured piece</p>
                                <h2 className="mt-1 truncate font-medium leading-snug">{featured.name}</h2>
                                <p className="mt-1 text-sm text-muted">
                                    {featured.price ? money(featured.price) : 'See options'}
                                    {Number(featured.compare_at_price) > Number(featured.price) && (
                                        <span className="ml-2 text-xs line-through">{money(featured.compare_at_price)}</span>
                                    )}
                                </p>
                                <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent">
                                    Shop this piece
                                    <Icon name="arrow-right" className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                                </p>
                            </div>
                        </div>
                    </Link>
                )}
            </div>
        </section>
    );
}
