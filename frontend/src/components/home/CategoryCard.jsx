import { Link } from 'react-router-dom';
import { categoryDemoImage } from '../../demoImages.js';
import { Icon } from '../icons.jsx';

const FALLBACKS = [
    'from-[#2c4a42] to-[#1b3b33]',
    'from-[#8d3316] to-[#5c2412]',
    'from-[#3f342c] to-[#1c1814]',
    'from-[#4a5344] to-[#2a332c]',
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
            className={`category-card group relative isolate flex h-full overflow-hidden rounded-2xl bg-ink text-paper shadow-soft outline-none ring-ink/0 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgb(22_19_17_/_0.14)] focus-visible:ring-2 focus-visible:ring-offset-2 ${
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
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent transition duration-300 group-hover:from-ink/90" />
            <div className={`relative mt-auto flex w-full items-end justify-between gap-3 ${featured ? 'p-5 sm:p-6' : 'p-4'}`}>
                <div className="min-w-0">
                    <h3 className={`font-display leading-tight ${featured ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'}`}>
                        {category.name}
                    </h3>
                    <p className="mt-1 text-xs text-white/75">{countLabel(category.products_count)}</p>
                </div>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper text-ink transition duration-300 group-hover:bg-accent group-hover:text-white">
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
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Browse</p>
                    <h2 className="font-display text-3xl md:text-4xl">Shop by category</h2>
                    <p className="mt-1 max-w-lg text-sm leading-6 text-muted">
                        Start with a department, then filter by price, brand, or what’s in stock.
                    </p>
                </div>
                <Link to="/shop" className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
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
