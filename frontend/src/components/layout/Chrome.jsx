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
        <Link to={to} aria-label={label} title={label} className="relative grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-canvas">
            {children}
            {badge > 0 && (
                <span className={`absolute -right-0.5 -top-0.5 min-w-4 rounded-full px-1 text-center text-[10px] font-medium leading-4 text-white ${badgeTone === 'ink' ? 'bg-ink' : 'bg-accent'}`}>
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
            <div className="hidden border-b border-white/10 bg-forest text-[11px] text-paper/80 sm:block">
                <Container className="flex items-center justify-between py-2">
                    <p className="tracking-wide">Live stock · Server-verified checkout · Free returns on eligible orders</p>
                    <div className="flex items-center gap-4">
                        <Link to="/help" className="transition hover:text-white">Help</Link>
                        <Link to="/contact" className="transition hover:text-white">Contact</Link>
                        {user?.roles?.includes('admin') && <Link to="/admin" className="transition hover:text-white">Admin</Link>}
                    </div>
                </Container>
            </div>
            <div className="border-b border-line/80 bg-paper/90 shadow-[0_8px_24px_rgb(22_19_17_/_0.04)] backdrop-blur-md">
                <Container>
                    <div className="flex items-center gap-3 py-3 lg:gap-8">
                        <IconButton name="menu" label="Open menu" className="lg:hidden" onClick={() => setMenuOpen(true)} />
                        <Link to="/" className="flex items-center gap-2.5">
                            <span className="grid h-9 w-9 place-items-center rounded-xl bg-forest font-display text-lg leading-none text-paper">W</span>
                            <span className="font-display text-[1.55rem] leading-none tracking-tight">Webfolks</span>
                        </Link>
                        <NavLinks />
                        <div className="hidden min-w-0 flex-1 lg:block">
                            <SearchBar />
                        </div>
                        <div className="ml-auto flex items-center rounded-full border border-line/80 bg-white/80 p-0.5">
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
                </Container>
            </div>
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
                <Link to="/" onClick={onClose} className="block rounded-lg px-3 py-2 hover:bg-canvas">Home</Link>
                <button type="button" className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-canvas" aria-expanded={shopOpen} onClick={() => setShopOpen((value) => !value)}>
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
                            <Link key={category.id} to={`/shop?category=${category.slug}`} onClick={onClose} className="flex items-center gap-2 py-1.5">
                                <CategoryThumb category={category} />
                                {category.name}
                            </Link>
                        ))}
                    </div>
                )}
                <Link to="/about" onClick={onClose} className="block rounded-lg px-3 py-2 hover:bg-canvas">About</Link>
                <Link to="/contact" onClick={onClose} className="block rounded-lg px-3 py-2 hover:bg-canvas">Contact</Link>
                <div className="my-3 border-t border-line" />
                {user ? (
                    <>
                        <Link to="/account" onClick={onClose} className="block rounded-lg px-3 py-2 hover:bg-canvas">My account</Link>
                        <Link to="/account/orders" onClick={onClose} className="block rounded-lg px-3 py-2 hover:bg-canvas">Orders</Link>
                        <Link to="/account/wishlist" onClick={onClose} className="block rounded-lg px-3 py-2 hover:bg-canvas">Wishlist</Link>
                        {user.roles?.includes('admin') && <Link to="/admin" onClick={onClose} className="block rounded-lg px-3 py-2 hover:bg-canvas">Admin</Link>}
                    </>
                ) : (
                    <>
                        <Link to="/login" onClick={onClose} className="block rounded-lg px-3 py-2 hover:bg-canvas">Sign in</Link>
                        <Link to="/register" onClick={onClose} className="block rounded-lg px-3 py-2 hover:bg-canvas">Create account</Link>
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
        <footer className="mt-20 w-full bg-forest text-paper">
            <Container className="grid gap-10 py-14 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
                <div>
                    <Link to="/" className="inline-flex items-center gap-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-paper font-display text-lg leading-none text-forest">W</span>
                        <span className="font-display text-2xl">Webfolks</span>
                    </Link>
                    <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">
                        Linen, knitwear, and everyday carry. Live stock, real checkout, payments confirmed on the server.
                    </p>
                    <Link
                        to="/contact"
                        className="mt-6 inline-flex items-center gap-2 rounded-full bg-paper px-4 py-2 text-sm font-medium text-forest transition hover:bg-white"
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
                                <Link key={label} to={href} className="block transition hover:text-white">{label}</Link>
                            ))}
                        </div>
                    </div>
                ))}
            </Container>
            <div className="border-t border-white/10">
                <Container className="flex flex-col gap-4 py-5 text-xs text-white/55 md:flex-row md:items-center md:justify-between">
                    <p>© {new Date().getFullYear()} Webfolks Commerce. Card details never touch this storefront.</p>
                    <p className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1"><Icon name="lock-closed" className="h-3.5 w-3.5" /> Secure checkout</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1"><Icon name="credit-card" className="h-3.5 w-3.5" /> Cards</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1"><Icon name="banknotes" className="h-3.5 w-3.5" /> COD</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1"><Icon name="globe-alt" className="h-3.5 w-3.5" /> PayPal</span>
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
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-paper/95 text-[11px] backdrop-blur lg:hidden" aria-label="Mobile shortcuts">
            {items.map(([to, label, icon]) => (
                to === 'search' ? (
                    <button key={label} type="button" className="py-2.5 text-muted" onClick={onSearch}>
                        <Icon name={icon} className="mx-auto h-5 w-5" />
                        Search
                    </button>
                ) : (
                    <NavLink key={label} to={to} className={({ isActive }) => `relative py-2.5 text-center ${isActive ? 'text-accent' : 'text-muted'}`}>
                        <Icon name={icon} variant={to === '/account/wishlist' && products.length ? 'solid' : 'outline'} className="mx-auto h-5 w-5" />
                        {label}
                        {to === '/shop' && count > 0 ? <span className="sr-only">{count} in cart</span> : null}
                    </NavLink>
                )
            ))}
        </nav>
    );
}
