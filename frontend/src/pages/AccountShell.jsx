import { Link, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Icon } from '../components/icons.jsx';
import { Skeleton } from '../components/common.jsx';

export function AccountNav() {
    const links = [
        ['/account', 'Profile', 'user'],
        ['/account/orders', 'Orders', 'clipboard-document-list'],
        ['/notifications', 'Notifications', 'bell'],
        ['/account/notifications', 'Alert settings', 'adjustments-horizontal'],
        ['/account/addresses', 'Addresses', 'map-pin'],
        ['/account/wishlist', 'Wishlist', 'heart'],
        ['/account/reviews', 'Reviews', 'star'],
        ['/account/security', 'Security', 'lock-closed'],
    ];

    return (
        <aside className="h-fit rounded-2xl border border-line bg-paper p-3 text-sm shadow-soft">
            {links.map(([to, label, icon]) => (
                <NavLink
                    key={to}
                    to={to}
                    end={to === '/account'}
                    className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-canvas font-medium text-ink' : 'text-muted hover:text-ink'}`}
                >
                    <Icon name={icon} className="h-4 w-4" />
                    {label}
                </NavLink>
            ))}
            <Link to="/help" className="mt-2 flex items-center gap-2 px-3 py-2 text-muted">
                <Icon name="chat-bubble" className="h-4 w-4" /> Help
            </Link>
        </aside>
    );
}

export function RequireAuth({ children }) {
    const { user, ready } = useAuth();

    if (!ready) {
        return <Skeleton className="h-40" />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export function AccountShell({ title, children }) {
    return (
        <RequireAuth>
            <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
                <AccountNav />
                <div className="mb-5">
                    {title && <h1 className="mb-5 font-display text-3xl md:text-4xl">{title}</h1>}
                    {children}
                </div>
            </div>
        </RequireAuth>
    );
}
