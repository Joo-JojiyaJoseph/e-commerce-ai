import { Link, NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Icon } from '../components/icons.jsx';
import { IconButton } from '../components/common.jsx';
import { useState } from 'react';

const links = [
    ['/admin', 'Dashboard', 'chart-bar'],
    ['/admin/products', 'Products', 'cube'],
    ['/admin/categories', 'Categories', 'tag'],
    ['/admin/brands', 'Brands', 'building-storefront'],
    ['/admin/inventory', 'Inventory', 'archive-box'],
    ['/admin/orders', 'Orders', 'clipboard-document-list'],
    ['/admin/reviews', 'Reviews', 'chat-bubble'],
    ['/admin/customers', 'Customers', 'users'],
    ['/admin/coupons', 'Coupons', 'sparkles'],
    ['/admin/notifications', 'Notifications', 'bell'],
];

export function RequireAdmin({ children }) {
    const { user, ready } = useAuth();

    if (!ready) {
        return <p className="p-8 text-sm text-muted">Loading…</p>;
    }

    if (!user) {
        return <Navigate to="/admin/login" replace />;
    }

    if (!user.roles?.includes('admin')) {
        return <Navigate to="/" replace />;
    }

    return children;
}

function Sidebar({ onNavigate }) {
    const { signOut, user } = useAuth();

    return (
        <div className="flex h-full flex-col">
            <Link to="/admin" className="flex cursor-pointer items-center gap-2.5" onClick={onNavigate}>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-paper font-display text-lg leading-none text-forest">W</span>
                <span>
                    <span className="block font-display text-xl leading-none tracking-tight">Webfolks</span>
                    <span className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-white/55">Admin</span>
                </span>
            </Link>
            <p className="mt-4 truncate px-1 text-xs text-white/50">{user?.email}</p>
            <nav className="mt-6 flex-1 space-y-1 text-sm">
                {links.map(([to, label, icon]) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/admin'}
                        onClick={onNavigate}
                        className={({ isActive }) => `flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 transition ${isActive ? 'bg-white/15 font-medium text-paper' : 'text-white/70 hover:bg-white/10 hover:text-paper'}`}
                    >
                        <Icon name={icon} className="h-4 w-4" />
                        {label}
                    </NavLink>
                ))}
            </nav>
            <div className="mt-6 space-y-1 border-t border-white/10 pt-4 text-sm">
                <Link to="/" className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-white/70 transition hover:bg-white/10 hover:text-paper" onClick={onNavigate}>
                    <Icon name="home" className="h-4 w-4" /> View store
                </Link>
                <button type="button" className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-red-200 transition hover:bg-white/10" onClick={signOut}>
                    <Icon name="arrow-right-on-rectangle" className="h-4 w-4" /> Sign out
                </button>
            </div>
        </div>
    );
}

export default function AdminLayout() {
    const [open, setOpen] = useState(false);

    return (
        <RequireAdmin>
            <div className="admin-app min-h-screen bg-canvas md:grid md:grid-cols-[248px_1fr]">
                <aside className="sticky top-0 hidden h-screen overflow-y-auto bg-forest p-5 text-paper md:block">
                    <Sidebar />
                </aside>
                <div className="flex items-center justify-between border-b border-line bg-paper px-4 py-3 md:hidden">
                    <Link to="/admin" className="flex cursor-pointer items-center gap-2 font-display text-xl">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-forest text-sm text-paper">W</span>
                        Admin
                    </Link>
                    <IconButton name="menu" label="Open menu" onClick={() => setOpen(true)} />
                </div>
                {open && (
                    <div className="fixed inset-0 z-50 md:hidden">
                        <button type="button" className="absolute inset-0 cursor-pointer bg-ink/40" aria-label="Close menu" onClick={() => setOpen(false)} />
                        <aside className="drawer-enter relative h-full w-72 bg-forest p-5 text-paper shadow-soft">
                            <div className="mb-4 flex justify-end">
                                <IconButton name="close" label="Close menu" className="text-paper hover:bg-white/10" onClick={() => setOpen(false)} />
                            </div>
                            <Sidebar onNavigate={() => setOpen(false)} />
                        </aside>
                    </div>
                )}
                <main className="p-4 md:p-8">
                    <div className="admin-shell">
                        <Outlet />
                    </div>
                </main>
            </div>
        </RequireAdmin>
    );
}
