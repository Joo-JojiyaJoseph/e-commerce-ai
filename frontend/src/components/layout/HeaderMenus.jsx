import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { money } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { categoryDemoImage } from '../../demoImages.js';
import { useCart } from '../../store/cart.jsx';
import { useCatalog } from '../../store/catalog.jsx';
import { Button } from '../common.jsx';
import { Icon } from '../icons.jsx';

function useMenu(closeOnEscape = true) {
    const [open, setOpen] = useState(false);
    const root = useRef(null);
    const leaveTimer = useRef(null);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        function onPointer(event) {
            if (!root.current?.contains(event.target)) {
                setOpen(false);
            }
        }

        function onKey(event) {
            if (closeOnEscape && event.key === 'Escape') {
                setOpen(false);
            }
        }

        document.addEventListener('pointerdown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, closeOnEscape]);

    function onEnter() {
        window.clearTimeout(leaveTimer.current);
        setOpen(true);
    }

    function onLeave() {
        leaveTimer.current = window.setTimeout(() => setOpen(false), 160);
    }

    return { open, setOpen, root, onEnter, onLeave };
}

function CategoryThumb({ category }) {
    const image = categoryDemoImage(category);

    if (image) {
        return (
            <img
                src={image}
                alt=""
                loading="lazy"
                className="h-12 w-12 shrink-0 rounded-md object-cover"
            />
        );
    }

    return (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-canvas font-display text-lg text-muted">
            {category.name?.slice(0, 1) || '?'}
        </span>
    );
}

export function ShopMenu() {
    const { categories } = useCatalog();
    const { open, setOpen, root, onEnter, onLeave } = useMenu();
    const mega = categories.length > 4;

    return (
        <div className="relative" ref={root} onMouseEnter={onEnter} onMouseLeave={onLeave}>
            <div className="flex items-center">
                <NavLink to="/shop" className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}>
                    Shop
                </NavLink>
                <button
                    type="button"
                    className="rounded-md p-1 text-muted hover:text-ink"
                    aria-label="Open shop menu"
                    aria-expanded={open}
                    aria-haspopup="true"
                    onClick={() => setOpen((value) => !value)}
                >
                    <Icon name="chevron" className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
                </button>
            </div>
            {open && (
                <div className={`dropdown-enter absolute left-0 z-[60] mt-2 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-paper p-3 shadow-soft ${mega ? 'w-[32rem]' : 'w-80'}`}>
                    <div className="mb-2 grid grid-cols-2 gap-1 border-b border-line pb-2">
                        <Link to="/shop" className="rounded-lg px-2 py-2 text-sm font-medium hover:bg-canvas" onClick={() => setOpen(false)}>All products</Link>
                        <Link to="/shop?sort=newest" className="rounded-lg px-2 py-2 text-sm hover:bg-canvas" onClick={() => setOpen(false)}>New arrivals</Link>
                    </div>
                    <p className="px-1 pb-2 text-[11px] uppercase tracking-[0.16em] text-muted">Categories</p>
                    {categories.length === 0 ? (
                        <p className="px-2 py-4 text-sm text-muted">Categories will appear here when they are published.</p>
                    ) : (
                        <div className={mega ? 'grid grid-cols-2 gap-1' : 'space-y-1'}>
                            {categories.map((category) => (
                                <Link
                                    key={category.id}
                                    to={`/shop?category=${category.slug}`}
                                    className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-canvas"
                                    onClick={() => setOpen(false)}
                                >
                                    <CategoryThumb category={category} />
                                    <span className="font-medium">{category.name}</span>
                                </Link>
                            ))}
                        </div>
                    )}
                    <Link
                        to="/shop"
                        className="mt-2 flex items-center gap-1 border-t border-line px-2 pt-3 text-sm font-medium hover:text-accent"
                        onClick={() => setOpen(false)}
                    >
                        View all products
                        <Icon name="chevron-right" className="h-4 w-4" />
                    </Link>
                </div>
            )}
        </div>
    );
}

export function AccountMenu() {
    const { user, signOut } = useAuth();
    const { open, setOpen, root, onEnter, onLeave } = useMenu();
    const navigate = useNavigate();

    const authed = [
        ['My account', '/account'],
        ['Orders', '/account/orders'],
        ['Wishlist', '/account/wishlist'],
        ['Notifications', '/notifications'],
        ['Addresses', '/account/addresses'],
    ];

    if (user?.roles?.includes('admin')) {
        authed.push(['Admin', '/admin']);
    }

    return (
        <div className="relative" ref={root} onMouseEnter={onEnter} onMouseLeave={onLeave}>
            <button
                type="button"
                className={`grid h-10 w-10 place-items-center rounded-full hover:bg-canvas ${open ? 'bg-canvas' : ''}`}
                aria-label={user ? 'Account menu' : 'Sign in'}
                title={user ? 'Account' : 'Sign in'}
                aria-expanded={open}
                aria-haspopup="true"
                onClick={() => setOpen((value) => !value)}
            >
                <Icon name="user" />
            </button>
            {open && (
                <div className="dropdown-enter absolute right-0 z-[60] mt-2 w-56 overflow-hidden rounded-xl border border-line bg-paper py-2 shadow-soft">
                    {user ? (
                        <>
                            <p className="truncate px-4 pb-2 text-xs text-muted">{user.name || user.email}</p>
                            {authed.map(([label, to]) => (
                                <Link key={to} to={to} className="block px-4 py-2 text-sm hover:bg-canvas" onClick={() => setOpen(false)}>
                                    {label}
                                </Link>
                            ))}
                            <button
                                type="button"
                                className="block w-full px-4 py-2 text-left text-sm text-danger hover:bg-canvas"
                                onClick={() => {
                                    setOpen(false);
                                    signOut();
                                    navigate('/');
                                }}
                            >
                                Sign out
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="block px-4 py-2 text-sm hover:bg-canvas" onClick={() => setOpen(false)}>Sign in</Link>
                            <Link to="/register" className="block px-4 py-2 text-sm hover:bg-canvas" onClick={() => setOpen(false)}>Create account</Link>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export function CartMenu() {
    const { cart, count, openDrawer } = useCart();
    const { open, setOpen, root } = useMenu();
    const items = cart?.items ?? [];

    function onToggle() {
        if (window.matchMedia('(max-width: 1023px)').matches) {
            openDrawer();
            return;
        }

        setOpen((value) => !value);
    }

    return (
        <div className="relative" ref={root}>
            <button
                type="button"
                aria-label={count ? `Cart, ${count} items` : 'Cart'}
                title="Cart"
                aria-expanded={open}
                className={`relative grid h-10 w-10 place-items-center rounded-full hover:bg-canvas ${open ? 'bg-canvas' : ''}`}
                onClick={onToggle}
            >
                <Icon name="bag" />
                {count > 0 && (
                    <span className="badge-pop absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-ink px-1 text-center text-[10px] font-medium leading-4 text-white">
                        {count > 99 ? '99+' : count}
                    </span>
                )}
            </button>
            {open && (
                <div className="dropdown-enter absolute right-0 z-[60] mt-2 w-80 overflow-hidden rounded-xl border border-line bg-paper shadow-soft">
                    <p className="border-b border-line px-4 py-3 text-sm font-medium">Your cart</p>
                    {items.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-muted">Your cart is empty.</p>
                    ) : (
                        <ul className="max-h-72 overflow-auto">
                            {items.map((item) => {
                                const name = item.variant?.product?.name ?? item.variant?.sku;
                                const image = item.variant?.product?.image_url;

                                return (
                                    <li key={item.id} className="flex gap-3 border-b border-line px-4 py-3 last:border-b-0">
                                        {image ? (
                                            <img src={image} alt="" className="h-12 w-12 rounded-md object-cover" />
                                        ) : (
                                            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-canvas font-display text-muted">{name?.slice(0, 1)}</span>
                                        )}
                                        <div className="min-w-0 flex-1 text-sm">
                                            <p className="truncate font-medium">{name}</p>
                                            <p className="text-muted">{money(item.unit_price)} × {item.quantity}</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {items.length > 0 && (
                        <div className="space-y-2 border-t border-line p-4">
                            <div className="flex justify-between text-sm font-medium">
                                <span>Subtotal</span>
                                <span>{money(cart.subtotal)}</span>
                            </div>
                            <Button as={Link} to="/checkout" className="w-full" onClick={() => setOpen(false)}>Checkout</Button>
                            <Button as={Link} to="/cart" variant="ghost" className="w-full" onClick={() => setOpen(false)}>View cart</Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export { CategoryThumb };
