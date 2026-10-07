import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminGet, money } from '../api.js';
import { ErrorState, PageHeader, Skeleton } from '../components/common.jsx';
import { Icon } from '../components/icons.jsx';

export default function AdminDashboard() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        adminGet('/api/admin/dashboard')
            .then((response) => setData(response.data))
            .catch((caught) => setError(caught.message));
    }, []);

    if (error) {
        return <ErrorState title="Dashboard unavailable" body={error} />;
    }

    if (!data) {
        return <Skeleton className="h-64" />;
    }

    const cards = [
        ['Today’s sales', money(data.sales), '/admin/orders', 'banknotes'],
        ['Orders', data.orders, '/admin/orders', 'clipboard-document-list'],
        ['Pending orders', data.pending_orders, '/admin/orders', 'truck'],
        ['Pending reviews', data.pending_reviews, '/admin/reviews', 'chat-bubble'],
        ['Low stock', data.low_stock, '/admin/inventory', 'archive-box'],
        ['Out of stock', data.out_of_stock, '/admin/inventory', 'exclamation-triangle'],
        ['Customers', data.customers, '/admin/customers', 'users'],
        ['Products', data.products, '/admin/products', 'cube'],
        ['Notifications (24h)', data.notification_activity, '/admin/notifications', 'bell'],
    ];

    return (
        <div className="space-y-6">
            <PageHeader eyebrow="Overview" title="Dashboard" subtitle="What needs attention in the store today." />
            <div className="scroll-reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map(([label, value, to, icon]) => (
                    <Link key={label} to={to} className="hover-lift group relative cursor-pointer overflow-hidden rounded-3xl border border-line bg-paper p-5 shadow-soft">
                        <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/15 blur-2xl transition duration-500 group-hover:scale-150" />
                        <p className="relative flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent ring-1 ring-white/70 transition duration-300 group-hover:bg-accent group-hover:text-white"><Icon name={icon} className="h-4 w-4" /></span> {label}
                        </p>
                        <p className="relative mt-4 font-display text-4xl font-extrabold tracking-tight">{value}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
