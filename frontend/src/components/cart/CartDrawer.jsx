import { Link } from 'react-router-dom';
import { money } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { useCart } from '../../store/cart.jsx';
import { useWishlist } from '../../store/wishlist.jsx';
import { useToast } from '../../toast.jsx';
import { Button, Drawer, EmptyState, Input } from '../common.jsx';
import { Icon } from '../icons.jsx';
import { couponCode } from '../../validate.js';
import { useEffect, useState } from 'react';

export function CartLine({ item, compact = false }) {
    const { updateItem, removeItem } = useCart();
    const { user } = useAuth();
    const { toggle } = useWishlist();
    const { push, error } = useToast();
    const name = item.variant?.product?.name ?? item.variant?.sku;
    const productId = item.variant?.product?.id;
    const slug = item.variant?.product?.slug;
    const image = item.variant?.product?.image_url;
    const quantity = Number(item.quantity) || 1;
    const [qty, setQty] = useState(quantity);

    useEffect(() => {
        setQty(quantity);
    }, [quantity]);

    async function setQuantity(next) {
        const value = Math.min(99, Math.max(1, next));
        setQty(value);
        await updateItem(item.id, value);
    }

    const thumbClass = compact ? 'h-16 w-16' : 'h-20 w-20';

    return (
        <div className="flex items-start gap-4 border-b border-line py-4 last:border-b-0">
            {slug ? (
                <Link to={`/products/${slug}`} className="shrink-0">
                    {image ? (
                        <img src={image} alt="" className={`${thumbClass} rounded-md object-cover`} />
                    ) : (
                        <span className={`flex ${thumbClass} items-center justify-center rounded-md bg-canvas font-display text-2xl text-muted`}>{name?.slice(0, 1)}</span>
                    )}
                </Link>
            ) : (
                <span className={`flex ${thumbClass} items-center justify-center rounded-md bg-canvas font-display text-2xl text-muted`}>{name?.slice(0, 1)}</span>
            )}
            <div className="min-w-0 flex-1">
                {slug ? (
                    <Link to={`/products/${slug}`} className="font-medium hover:underline">{name}</Link>
                ) : (
                    <p className="font-medium">{name}</p>
                )}
                <p className="mt-0.5 text-sm text-muted">{item.variant?.sku} · {money(item.unit_price)} each</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center rounded-md border border-line">
                        <button type="button" className="px-2 py-1 text-sm" aria-label="Decrease quantity" onClick={() => setQuantity(quantity - 1)} disabled={quantity <= 1}>
                            <Icon name="minus" className="h-4 w-4" />
                        </button>
                        <input
                            type="number"
                            min={1}
                            max={99}
                            value={qty}
                            aria-label={`Quantity for ${name}`}
                            className="w-12 border-x border-line bg-transparent py-1 text-center text-sm outline-none"
                            onChange={(event) => setQty(Number(event.target.value) || 1)}
                            onBlur={() => setQuantity(qty)}
                        />
                        <button type="button" className="px-2 py-1 text-sm" aria-label="Increase quantity" onClick={() => setQuantity(quantity + 1)}>
                            <Icon name="plus" className="h-4 w-4" />
                        </button>
                    </div>
                    <button type="button" className="text-xs text-danger" onClick={() => removeItem(item.id)}>Remove</button>
                    {user && productId && (
                        <button
                            type="button"
                            className="text-xs underline"
                            onClick={async () => {
                                try {
                                    await toggle({ id: productId, name, slug });
                                    await removeItem(item.id);
                                    push({ title: 'Saved for later', message: `${name} was moved to your wishlist.`, tone: 'success' });
                                } catch (caught) {
                                    error('Could not save for later', caught.message);
                                }
                            }}
                        >
                            Save for later
                        </button>
                    )}
                </div>
            </div>
            {!compact && <p className="shrink-0 text-sm font-medium">{money(item.line_total)}</p>}
        </div>
    );
}

export function CartSummary({ cart }) {
    const [code, setCode] = useState('');
    const [error, setError] = useState(null);
    const [applying, setApplying] = useState(false);
    const { applyCode, removeCode } = useCart();

    return (
        <aside className="h-fit space-y-4 rounded-2xl border border-line bg-paper p-5 shadow-soft">
            <h2 className="font-medium">Order summary</h2>
            <form
                noValidate
                onSubmit={async (event) => {
                    event.preventDefault();
                    const invalid = couponCode(code);
                    if (invalid) {
                        setError(invalid);
                        return;
                    }
                    setApplying(true);
                    try {
                        await applyCode(code.trim().toUpperCase());
                        setCode('');
                        setError(null);
                    } catch (caught) {
                        setError(caught.message);
                    } finally {
                        setApplying(false);
                    }
                }}
                className="space-y-2"
            >
                <Input label="Coupon code" maxLength={32} autoComplete="off" value={code} error={error} onChange={(event) => { setCode(event.target.value.toUpperCase()); setError(null); }} placeholder="WELCOME10" />
                <Button type="submit" variant="ghost" className="w-full" loading={applying} loadingLabel="Applying…">Apply coupon</Button>
            </form>
            {cart.discount && (
                <div className="flex justify-between rounded-md bg-canvas px-3 py-2 text-sm">
                    <span>{cart.discount.code} applied</span>
                    <button type="button" className="text-danger" onClick={removeCode}>Remove</button>
                </div>
            )}
            <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{money(cart.subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>-{money(cart.discount_total)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{money(cart.shipping_total)}</dd></div>
                <div className="flex justify-between border-t border-line pt-2 font-medium"><dt>Total</dt><dd>{money(cart.total)}</dd></div>
            </dl>
            <Button as={Link} to="/checkout" className="w-full rounded-full">Checkout</Button>
            <Button as={Link} to="/shop" variant="ghost" className="w-full rounded-full">Continue shopping</Button>
        </aside>
    );
}

export default function CartDrawer() {
    const { cart, drawerOpen, closeDrawer } = useCart();

    return (
        <Drawer open={drawerOpen} title="Cart" onClose={closeDrawer}>
            {!cart || cart.items?.length === 0 ? (
                <EmptyState title="Your cart is empty" body="Add a piece from the floor and it will appear here." action={<Button as={Link} to="/shop" onClick={closeDrawer}>Start shopping</Button>} />
            ) : (
                <div>
                    {cart.items.map((item) => <CartLine key={item.id} item={item} compact />)}
                    <div className="mt-4 flex justify-between text-sm font-medium">
                        <span>Total</span>
                        <span>{money(cart.total)}</span>
                    </div>
                    <Button as={Link} to="/checkout" className="mt-4 w-full rounded-full" onClick={closeDrawer}>Checkout</Button>
                    <Button as={Link} to="/cart" variant="ghost" className="mt-2 w-full rounded-full" onClick={closeDrawer}>View cart</Button>
                </div>
            )}
        </Drawer>
    );
}
