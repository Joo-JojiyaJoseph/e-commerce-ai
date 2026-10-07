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
    ['/admin/integrations', 'Integrations', 'cog'],
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
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent font-display text-lg font-extrabold leading-none text-white shadow-[0_8px_18px_-4px_rgb(109_74_255_/_0.7)]">W</span>
                <span>
                    <span className="block font-display text-xl leading-none tracking-tight">Webfolks</span>
                    <span className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-white/55">Admin</span>
                </span>
            </Link>
            <p className="mt-5 truncate rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">{user?.email}</p>
            <nav className="mt-6 flex-1 space-y-1 text-sm">
                {links.map(([to, label, icon]) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/admin'}
                        onClick={onNavigate}
                        className={({ isActive }) => `group relative flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 transition duration-300 ${isActive ? 'border border-white/15 bg-white/15 font-medium text-white shadow-[0_1px_0_rgb(255_255_255_/_0.15)_inset,0_8px_20px_-8px_rgb(109_74_255_/_0.8)]' : 'border border-transparent text-white/65 hover:translate-x-0.5 hover:bg-white/10 hover:text-white'}`}
                    >
                        <Icon name={icon} className="h-4 w-4 transition group-hover:scale-110" />
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
            <div className="admin-app min-h-screen md:grid md:grid-cols-[272px_1fr]">
                <aside className="sticky top-3 m-3 hidden h-[calc(100vh-1.5rem)] overflow-y-auto rounded-[1.75rem] border border-white/10 bg-forest p-5 text-paper shadow-[0_1px_0_rgb(255_255_255_/_0.1)_inset,0_30px_70px_-20px_rgb(40_30_110_/_0.6)] md:block">
                    <Sidebar />
                </aside>
                <div className="glass sticky top-3 z-40 m-3 flex items-center justify-between rounded-2xl px-4 py-2.5 md:hidden">
                    <Link to="/admin" className="flex cursor-pointer items-center gap-2 font-display text-xl">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm font-extrabold text-white">W</span>
                        Admin
                    </Link>
                    <IconButton name="menu" label="Open menu" onClick={() => setOpen(true)} />
                </div>
                {open && (
                    <div className="fixed inset-0 z-50 md:hidden">
                        <button type="button" className="backdrop-enter absolute inset-0 cursor-pointer bg-ink/30" aria-label="Close menu" onClick={() => setOpen(false)} />
                        <aside className="drawer-enter relative m-3 h-[calc(100%-1.5rem)] w-72 rounded-[1.75rem] border border-white/10 bg-forest p-5 text-paper shadow-[0_30px_80px_-10px_rgb(0_0_0_/_0.5)]">
                            <div className="mb-4 flex justify-end">
                                <IconButton name="close" label="Close menu" className="text-paper hover:bg-white/10" onClick={() => setOpen(false)} />
                            </div>
                            <Sidebar onNavigate={() => setOpen(false)} />
                        </aside>
                    </div>
                )}
                <main className="p-4 md:p-8 md:pl-5">
                    <div className="admin-shell">
                        <div className="reveal"><Outlet /></div>
                    </div>
                </main>
            </div>
        </RequireAdmin>
    );
}
