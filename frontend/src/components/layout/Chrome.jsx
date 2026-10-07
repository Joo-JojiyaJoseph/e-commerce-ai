import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../auth.jsx';
import { useCart } from '../../store/cart.jsx';
import { useCatalog } from '../../store/catalog.jsx';
import { useWishlist } from '../../store/wishlist.jsx';
import { Container, Drawer, IconButton } from '../common.jsx';
import { Icon } from '../icons.jsx';
import SearchBar from '../search/SearchBar.jsx';
import NotificationBell from '../notifications/NotificationBell.jsx';
import { AccountMenu, CartMenu, CategoryThumb, ShopMenu } from './HeaderMenus.jsx';

function NavLinks() {
    return (
        <nav className="hidden items-center gap-5 xl:gap-6 lg:flex" aria-label="Primary">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}>Home</NavLink>
            <ShopMenu />
            <NavLink to="/about" className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}>About</NavLink>
            <NavLink to="/contact" className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}>Contact</NavLink>
        </nav>
    );
}

function HeaderIcon({ to, label, badge, badgeTone = 'accent', children }) {
    return (
        <Link to={to} aria-label={label} title={label} className="relative grid h-10 w-10 place-items-center rounded-full text-ink transition duration-300 hover:bg-white/80 hover:shadow-sm active:scale-90">
            {children}
            {badge > 0 && (
                <span className={`absolute -right-0.5 -top-0.5 min-w-4 rounded-full px-1 badge-pop text-center text-[10px] font-semibold leading-4 text-white ring-2 ring-white/70 ${badgeTone === 'ink' ? 'bg-ink' : 'bg-accent'}`}>
                    {badge > 99 ? '99+' : badge}
                </span>
            )}
        </Link>
    );
}

export default function Header() {
    const { user } = useAuth();
    const { products } = useWishlist();
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-[45] w-full">
            <div className="hidden bg-forest text-[11px] text-white/80 sm:block" style={{ backgroundImage: 'linear-gradient(90deg, rgb(109 74 255 / 0.35), rgb(217 70 239 / 0.2), rgb(56 189 248 / 0.25))' }}>
                <Container className="flex items-center justify-between py-1.5">
                    <p className="inline-flex items-center gap-2 tracking-wide">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
                        </span>
                        Live stock · Server-verified checkout · Free returns on eligible orders
                    </p>
                    <div className="flex items-center gap-4">
                        <Link to="/help" className="transition hover:text-white">Help</Link>
                        <Link to="/contact" className="transition hover:text-white">Contact</Link>
                        {user?.roles?.includes('admin') && <Link to="/admin" className="transition hover:text-white">Admin</Link>}
                    </div>
                </Container>
            </div>
            <Container className="pt-3">
                <div className="glass rounded-2xl px-3 shadow-[0_1px_0_rgb(255_255_255_/_0.9)_inset,0_16px_48px_-12px_rgb(76_56_180_/_0.3)] sm:px-4">
                    <div className="flex items-center gap-3 py-2.5 lg:gap-6">
                        <IconButton name="menu" label="Open menu" className="lg:hidden" onClick={() => setMenuOpen(true)} />
                        <Link to="/" className="group flex items-center gap-2.5">
                            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent font-display text-lg font-extrabold leading-none text-white shadow-[0_8px_18px_-4px_rgb(109_74_255_/_0.7)] transition duration-500 group-hover:rotate-[-8deg] group-hover:scale-110">W</span>
                            <span className="font-display text-[1.4rem] font-extrabold leading-none tracking-tight">Webfolks</span>
                        </Link>
                        <NavLinks />
                        <div className="hidden min-w-0 flex-1 lg:block">
                            <SearchBar />
                        </div>
                        <div className="ml-auto flex items-center rounded-full border border-white/70 bg-white/50 p-0.5 backdrop-blur-xl">
                            <HeaderIcon
                                to="/account/wishlist"
                                label={products.length ? `Wishlist, ${products.length} saved` : 'Wishlist'}
                                badge={products.length}
                            >
                                <Icon
                                    name="heart"
                                    variant={products.length > 0 ? 'solid' : 'outline'}
                                    className={products.length > 0 ? 'h-5 w-5 text-accent' : 'h-5 w-5'}
                                />
                            </HeaderIcon>
                            <NotificationBell />
                            <CartMenu />
                            <div className="hidden sm:block">
                                <AccountMenu />
                            </div>
                        </div>
                    </div>
                    <div className="pb-3 lg:hidden">
                        <SearchBar compact />
                    </div>
                </div>
            </Container>
            <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} user={user} />
        </header>
    );
}

function MobileMenu({ open, onClose, user }) {
    const { categories } = useCatalog();
    const [shopOpen, setShopOpen] = useState(false);

    return (
        <Drawer open={open} title="Menu" onClose={onClose} side="left">
            <nav className="space-y-1 text-base" aria-label="Mobile">
                <Link to="/" onClick={onClose} className="block rounded-xl px-3 py-2.5 transition hover:bg-white/70">Home</Link>
                <button type="button" className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-white/70" aria-expanded={shopOpen} onClick={() => setShopOpen((value) => !value)}>
                    Shop
                    <Icon name="chevron" className={`h-4 w-4 transition ${shopOpen ? 'rotate-180' : ''}`} />
                </button>
                {shopOpen && (
                    <div className="ml-3 space-y-1 border-l border-line pl-3 text-sm">
                        <Link to="/shop" onClick={onClose} className="block py-1.5 font-medium">All products</Link>
                        <Link to="/shop?sort=newest" onClick={onClose} className="block py-1.5 text-muted">New arrivals</Link>
                        {categories.length === 0 ? (
                            <p className="py-2 text-muted">No categories yet.</p>
                        ) : categories.map((category) => (
                            <div key={category.id}>
                                <Link to={`/shop?category=${category.slug}`} onClick={onClose} className="flex items-center gap-2 py-1.5">
                                    <CategoryThumb category={category} />
                                    {category.name}
                                </Link>
                                {(category.children ?? []).map((child) => (
                                    <Link key={child.id} to={`/shop?category=${child.slug}`} onClick={onClose} className="block py-1 pl-10 text-sm text-muted">
                                        {child.name}
                                    </Link>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
                <Link to="/about" onClick={onClose} className="block rounded-xl px-3 py-2.5 transition hover:bg-white/70">About</Link>
                <Link to="/contact" onClick={onClose} className="block rounded-xl px-3 py-2.5 transition hover:bg-white/70">Contact</Link>
                <div className="my-3 border-t border-line" />
                {user ? (
                    <>
                        <Link to="/account" onClick={onClose} className="block rounded-xl px-3 py-2.5 transition hover:bg-white/70">My account</Link>
                        <Link to="/account/orders" onClick={onClose} className="block rounded-xl px-3 py-2.5 transition hover:bg-white/70">Orders</Link>
                        <Link to="/account/wishlist" onClick={onClose} className="block rounded-xl px-3 py-2.5 transition hover:bg-white/70">Wishlist</Link>
                        {user.roles?.includes('admin') && <Link to="/admin" onClick={onClose} className="block rounded-xl px-3 py-2.5 transition hover:bg-white/70">Admin</Link>}
                    </>
                ) : (
                    <>
                        <Link to="/login" onClick={onClose} className="block rounded-xl px-3 py-2.5 transition hover:bg-white/70">Sign in</Link>
                        <Link to="/register" onClick={onClose} className="block rounded-xl px-3 py-2.5 transition hover:bg-white/70">Create account</Link>
                    </>
                )}
            </nav>
        </Drawer>
    );
}

export function Footer() {
    const { categories } = useCatalog();
    const [open, setOpen] = useState('');

    const groups = [
        ['Shop', [['All products', '/shop'], ['New arrivals', '/shop?sort=newest'], ...categories.slice(0, 5).map((category) => [category.name, `/shop?category=${category.slug}`])]],
        ['Company', [['About', '/about'], ['Contact', '/contact'], ['Help', '/help']]],
        ['Account', [['Orders', '/account/orders'], ['Wishlist', '/account/wishlist'], ['Addresses', '/account/addresses'], ['Sign in', '/login']]],
    ];

    return (
        <footer className="relative mx-auto mt-24 w-full max-w-[96rem] overflow-hidden rounded-t-[2.5rem] border border-b-0 border-white/10 bg-forest text-paper shadow-[0_-24px_80px_-20px_rgb(76_56_180_/_0.4)]">
            <div className="orb float-slow -left-24 -top-24 h-72 w-72 bg-accent/50" />
            <div className="orb float-slower -right-16 bottom-0 h-64 w-64 bg-fuchsia-500/30" />
            <Container className="relative grid gap-10 py-16 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
                <div>
                    <Link to="/" className="inline-flex items-center gap-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent font-display text-lg font-extrabold leading-none text-white shadow-[0_8px_18px_-4px_rgb(109_74_255_/_0.7)]">W</span>
                        <span className="font-display text-2xl">Webfolks</span>
                    </Link>
                    <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">
                        Linen, knitwear, and everyday carry. Live stock, real checkout, payments confirmed on the server.
                    </p>
                    <Link
                        to="/contact"
                        className="btn-shine mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/20"
                    >
                        <Icon name="envelope" className="h-4 w-4" /> Write to us
                    </Link>
                </div>
                {groups.map(([title, links]) => (
                    <div key={title}>
                        <button
                            type="button"
                            className="flex w-full items-center justify-between text-sm font-medium tracking-wide md:pointer-events-none"
                            onClick={() => setOpen(open === title ? '' : title)}
                        >
                            {title}
                            <span className="md:hidden">{open === title ? '−' : '+'}</span>
                        </button>
                        <div className={`mt-4 space-y-2.5 text-sm text-white/70 ${open === title ? 'block' : 'hidden'} md:block`}>
                            {links.map(([label, href]) => (
                                <Link key={label} to={href} className="block transition duration-300 hover:translate-x-1 hover:text-white">{label}</Link>
                            ))}
                        </div>
                    </div>
                ))}
            </Container>
            <div className="relative border-t border-white/10">
                <Container className="flex flex-col gap-4 py-5 text-xs text-white/55 md:flex-row md:items-center md:justify-between">
                    <p>© {new Date().getFullYear()} Webfolks Commerce. Card details never touch this storefront.</p>
                    <p className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 backdrop-blur"><Icon name="lock-closed" className="h-3.5 w-3.5" /> Secure checkout</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 backdrop-blur"><Icon name="credit-card" className="h-3.5 w-3.5" /> Cards</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 backdrop-blur"><Icon name="banknotes" className="h-3.5 w-3.5" /> COD</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 backdrop-blur"><Icon name="globe-alt" className="h-3.5 w-3.5" /> PayPal</span>
                    </p>
                </Container>
            </div>
        </footer>
    );
}

export function MobileNav({ onSearch }) {
    const { user } = useAuth();
    const { count } = useCart();
    const { products } = useWishlist();

    const items = [
        ['/', 'Home', 'home'],
        ['/shop', 'Shop', 'grid'],
        ['search', 'Search', 'search'],
        ['/account/wishlist', 'Saved', 'heart'],
        [user ? '/account' : '/login', 'Account', 'user'],
    ];

    return (
        <nav className="glass fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl text-[11px] font-medium shadow-[0_1px_0_rgb(255_255_255_/_0.9)_inset,0_16px_40px_-8px_rgb(40_30_110_/_0.35)] lg:hidden" aria-label="Mobile shortcuts">
            {items.map(([to, label, icon]) => (
                to === 'search' ? (
                    <button key={label} type="button" className="py-2.5 text-muted" onClick={onSearch}>
                        <Icon name={icon} className="mx-auto h-5 w-5" />
                        Search
                    </button>
                ) : (
                    <NavLink key={label} to={to} className={({ isActive }) => `relative py-2.5 text-center transition active:scale-90 ${isActive ? 'text-accent' : 'text-muted'}`}>
                        <Icon name={icon} variant={to === '/account/wishlist' && products.length ? 'solid' : 'outline'} className="mx-auto h-5 w-5" />
                        {label}
                        {to === '/shop' && count > 0 ? <span className="sr-only">{count} in cart</span> : null}
                    </NavLink>
                )
            ))}
        </nav>
    );
}
