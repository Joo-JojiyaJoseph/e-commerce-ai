import { Link } from 'react-router-dom';
import { Button } from '../components/common.jsx';
import { useCatalog } from '../store/catalog.jsx';

export default function About() {
    const { categories, brands, home } = useCatalog();
    const productCount = home?.new_arrivals ? home.new_arrivals.length : 0;
    const image = home?.new_arrivals?.[0]?.image_url;

    return (
        <div className="space-y-16">
            <section className="grid items-center gap-8 md:grid-cols-2">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted">About</p>
                    <h1 className="mt-2 font-display text-5xl leading-tight">A quieter store for pieces you will actually wear.</h1>
                    <p className="mt-4 max-w-md text-sm leading-6 text-muted">
                        Webfolks Commerce is a live Laravel catalogue, cart, and checkout — not a demo theme bolted onto a spreadsheet.
                    </p>
                    <Button as={Link} to="/shop" className="mt-6 rounded-full">Shop the floor</Button>
                </div>
                <div className="min-h-64 overflow-hidden rounded-3xl bg-forest shadow-soft">
                    {image && <img src={image} alt="" className="h-full w-full object-cover" />}
                </div>
            </section>
            <section className="grid gap-6 md:grid-cols-3">
                {[
                    ['Mission', 'Sell durable everyday goods with honest stock, prices, and order status.'],
                    ['Vision', 'Keep the store small enough to stay true, and structured enough to grow.'],
                    ['Values', 'No fake inventory. No invented discounts. No catalogue that cannot check out.'],
                ].map(([title, body]) => (
                    <article key={title} className="rounded-2xl border border-line bg-paper p-6 shadow-soft">
                        <h2 className="font-display text-2xl">{title}</h2>
                        <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
                    </article>
                ))}
            </section>
            <section className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <Stat value={String(productCount || '—')} label="Products on this floor" />
                <Stat value={String(categories.length || '—')} label="Live categories" />
                <Stat value={String(brands.length || '—')} label="Brands" />
            </section>
        </div>
    );
}

function Stat({ value, label }) {
    return (
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
            <p className="font-display text-3xl">{value}</p>
            <p className="mt-1 text-sm text-muted">{label}</p>
        </div>
    );
}
