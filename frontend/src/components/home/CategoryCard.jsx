import { Link } from 'react-router-dom';
import { categoryDemoImage } from '../../demoImages.js';
import { Icon } from '../icons.jsx';

const FALLBACKS = [
    'from-[#6d4aff] to-[#2a1a8f]',
    'from-[#ec4899] to-[#7c1d6f]',
    'from-[#0ea5e9] to-[#1e3a8a]',
    'from-[#14b8a6] to-[#134e4a]',
];

function countLabel(count) {
    if (!count) {
        return 'Browse the collection';
    }

    return count === 1 ? '1 piece' : `${count} pieces`;
}

export function CategoryCard({ category, featured = false }) {
    const tone = FALLBACKS[(Number(category.id) || 0) % FALLBACKS.length];
    const image = categoryDemoImage(category);

    return (
        <Link
            to={`/shop?category=${category.slug}`}
            className={`category-card hover-lift group relative isolate flex h-full overflow-hidden rounded-[1.5rem] border border-white/40 bg-ink text-paper shadow-soft outline-none ring-accent/0 focus-visible:ring-2 focus-visible:ring-offset-2 ${
                featured ? 'min-h-[17rem] sm:min-h-[22rem] lg:min-h-full' : 'min-h-[11.5rem] sm:min-h-[14rem]'
            }`}
        >
            {image ? (
                <img
                    src={image}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.07]"
                />
            ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${tone}`}>
                    <span className="absolute right-4 top-3 font-display text-7xl leading-none text-white/10">
                        {category.name?.slice(0, 1) || '?'}
                    </span>
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent transition duration-300 group-hover:from-ink/90" />
            <div className={`relative m-2.5 mt-auto flex w-auto grow items-end justify-between gap-3 rounded-2xl border border-white/20 bg-white/10 shadow-[0_1px_0_rgb(255_255_255_/_0.25)_inset] backdrop-blur-xl ${featured ? 'p-5 sm:p-6' : 'p-3.5'}`}>
                <div className="min-w-0">
                    <h3 className={`font-display leading-tight ${featured ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'}`}>
                        {category.name}
                    </h3>
                    <p className="mt-1 text-xs text-white/75">{countLabel(category.products_count)}</p>
                </div>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 text-ink transition duration-500 group-hover:rotate-[-45deg] group-hover:bg-accent group-hover:text-white">
                    <Icon name="arrow-right" className="h-4 w-4" />
                </span>
            </div>
        </Link>
    );
}

export function CategoryGrid({ categories = [] }) {
    if (!categories.length) {
        return null;
    }

    const featured = categories.length > 2;

    return (
        <section>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/55 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-accent-dark backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Browse</p>
                    <h2 className="font-display text-3xl md:text-4xl">Shop by category</h2>
                    <p className="mt-1 max-w-lg text-sm leading-6 text-muted">
                        Start with a department, then filter by price, brand, or what’s in stock.
                    </p>
                </div>
                <Link to="/shop" className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/55 px-4 py-2 text-sm font-medium backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/80">
                    View all products
                    <Icon name="arrow-right" className="h-4 w-4" />
                </Link>
            </div>
            <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${featured ? 'lg:grid-cols-4 lg:grid-rows-2' : 'md:grid-cols-4'}`}>
                {categories.map((category, index) => (
                    <div
                        key={category.id}
                        className={index === 0 && featured ? 'col-span-2 row-span-2 h-full min-h-[17rem]' : 'h-full'}
                    >
                        <CategoryCard category={category} featured={index === 0 && featured} />
                    </div>
                ))}
            </div>
        </section>
    );
}
