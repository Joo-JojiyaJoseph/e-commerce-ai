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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map(([label, value, to, icon]) => (
                    <Link key={label} to={to} className="cursor-pointer rounded-2xl border border-line bg-paper p-5 transition hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-soft">
                        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted">
                            <Icon name={icon} className="h-4 w-4" /> {label}
                        </p>
                        <p className="mt-2 font-display text-3xl">{value}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
