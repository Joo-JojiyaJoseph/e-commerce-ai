import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, checkout, confirmPayment, createAddress, getAddresses, getPaymentMethods, money } from '../api.js';
import { Button, ErrorState, Input, Notice, Select, Skeleton, Stepper } from '../components/common.jsx';
import { Icon } from '../components/icons.jsx';
import { useAuth } from '../auth.jsx';
import { completeHostedPayment } from '../payments.js';
import { useCart } from '../store/cart.jsx';
import { addressErrors, flattenErrors, hasErrors } from '../validate.js';

const emptyAddress = {
    name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    region: '',
    postal_code: '',
    country: 'IN',
};

function fromSaved(item) {
    return {
        name: item.name ?? '',
        phone: item.phone ?? '',
        line1: item.line1 ?? '',
        line2: item.line2 ?? '',
        city: item.city ?? '',
        region: item.region ?? '',
        postal_code: item.postal_code ?? '',
        country: item.country || 'IN',
    };
}

export default function Checkout() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const buyNowId = params.get('buy_now');
    const { user } = useAuth();
    const { cart, refresh } = useCart();
    const [address, setAddress] = useState(emptyAddress);
    const [saved, setSaved] = useState([]);
    const [methods, setMethods] = useState([]);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [method, setMethod] = useState('');
    const [loading, setLoading] = useState(false);
    const [saveAddress, setSaveAddress] = useState(true);
    const [selectedAddressId, setSelectedAddressId] = useState('');

    const checkoutItems = useMemo(() => {
        const items = cart?.items ?? [];
        if (!buyNowId) {
            return items;
        }
        return items.filter((item) => String(item.id) === String(buyNowId));
    }, [cart, buyNowId]);

    const totals = useMemo(() => {
        const subtotal = checkoutItems.reduce((sum, item) => sum + Number(item.line_total || 0), 0);
        const shipping = Number(cart?.shipping_total || 0);
        const discount = buyNowId ? 0 : Number(cart?.discount_total || 0);
        return {
            subtotal,
            shipping,
            discount,
            total: buyNowId ? subtotal + shipping : Number(cart?.total || subtotal + shipping - discount),
        };
    }, [cart, checkoutItems, buyNowId]);

    useEffect(() => {
        refresh().then((data) => {
            if (!data.items?.length) {
                navigate('/cart');
                return;
            }
            if (buyNowId && !data.items.some((item) => String(item.id) === String(buyNowId))) {
                navigate('/cart');
            }
        });

        getPaymentMethods()
            .then(({ data }) => {
                setMethods(data.methods ?? []);
                setMethod((current) => current || data.methods?.[0]?.id || 'cod');
            })
            .catch(() => setMethods([{ id: 'cod', label: 'Cash on delivery', icon: 'banknotes', description: 'Pay when the order arrives.' }]));

        if (user) {
            getAddresses()
                .then(({ data }) => {
                    const list = Array.isArray(data) ? data : [];
                    setSaved(list);
                    const preferred = list.find((item) => item.is_default) ?? list[0];
                    if (preferred) {
                        setSelectedAddressId(String(preferred.id));
                        setAddress(fromSaved(preferred));
                    }
                })
                .catch(() => setSaved([]));
        } else {
            setSaved([]);
        }
    }, [navigate, user, buyNowId]);

    function updateAddress(key, value) {
        setAddress((current) => ({ ...current, [key]: value }));
        setFieldErrors((current) => ({ ...current, [`shipping_address.${key}`]: undefined }));
    }

    async function onSubmit(event) {
        event.preventDefault();
        const nextErrors = Object.fromEntries(
            Object.entries(addressErrors(address, { requirePhone: true })).map(([key, message]) => [`shipping_address.${key}`, message]),
        );

        if (hasErrors(nextErrors) || !method) {
            setFieldErrors(nextErrors);
            setError(method ? null : 'Choose a payment method.');
            window.requestAnimationFrame(() => {
                document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
            return;
        }

        const shippingAddress = {
            ...address,
            name: address.name.trim(),
            phone: address.phone.trim(),
            country: (address.country || 'IN').trim().slice(0, 2).toUpperCase(),
        };

        setLoading(true);
        setError(null);
        setFieldErrors({});

        try {
            if (user && saveAddress && shippingAddress.line1 && shippingAddress.city && shippingAddress.postal_code) {
                const alreadySaved = saved.some((item) => (
                    item.line1 === shippingAddress.line1
                    && item.postal_code === shippingAddress.postal_code
                    && item.city === shippingAddress.city
                    && (item.phone || '') === shippingAddress.phone
                ));

                if (!alreadySaved) {
                    try {
                        const { data: created } = await createAddress({
                            ...shippingAddress,
                            is_default: saved.length === 0,
                        });
                        setSaved((current) => [created, ...current]);
                        setSelectedAddressId(String(created.id));
                    } catch {
                        // Checkout can continue if the address book write fails.
                    }
                }
            }

            const payload = {
                shipping_address: shippingAddress,
                payment: { method },
            };

            if (buyNowId) {
                payload.item_ids = [Number(buyNowId)];
            }

            const { data } = await checkout(payload);
            const hosted = await completeHostedPayment(data, data.payment);

            if (hosted.redirected) {
                return;
            }

            if (hosted.razorpay) {
                const confirmed = await confirmPayment({
                    order_number: data.number,
                    razorpay_order_id: hosted.razorpay.razorpay_order_id,
                    razorpay_payment_id: hosted.razorpay.razorpay_payment_id,
                    razorpay_signature: hosted.razorpay.razorpay_signature,
                });
                await refresh();
                navigate(`/orders/${confirmed.data.number}`);
                return;
            }

            const accepted = data.payment_status === 'completed' || (data.payment_status === 'pending' && data.payment_gateway === 'cod');

            if (!accepted) {
                setError('Payment could not be completed. No order was created.');
                return;
            }

            await refresh();
            navigate(`/orders/${data.number}`);
        } catch (caught) {
            if (caught instanceof ApiError) {
                setError(caught.message);
                setFieldErrors(flattenErrors(caught.errors));
                return;
            }

            setError(caught.message || 'Unable to place the order. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    if (!cart) {
        return <Skeleton className="h-80" />;
    }

    const remainingCount = (cart.items?.length ?? 0) - checkoutItems.length;
    const loginNext = `/checkout${buyNowId ? `?buy_now=${buyNowId}` : ''}`;

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <Stepper steps={['Bag', 'Details', 'Pay']} current={1} />
                <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{buyNowId ? 'Express checkout' : 'Checkout'}</p>
                    <h1 className="font-display text-4xl">{buyNowId ? 'Buy now' : 'Checkout'}</h1>
                    <p className="mt-1 text-sm text-muted">We’ll use this number for delivery updates.</p>
                </div>
                {buyNowId && (
                    <Notice tone="accent" title="Checking out this item only">
                        {remainingCount > 0
                            ? `${remainingCount} other item${remainingCount === 1 ? '' : 's'} will stay in your bag.`
                            : 'This piece is in your bag, and this order is just for it.'}
                    </Notice>
                )}
            </div>

            <div className="grid items-start gap-8 lg:grid-cols-3">
                <form id="checkout-form" noValidate onSubmit={onSubmit} className="space-y-5 lg:col-span-2">
                    {error && <ErrorState title="Checkout could not finish" body={error} />}
                    <section className="rounded-2xl border border-line bg-paper p-5 shadow-soft md:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="font-medium">Delivery address</h2>
                                <p className="mt-0.5 text-sm text-muted">Where should we send this order?</p>
                            </div>
                            <span className="hidden rounded-full bg-canvas px-2.5 py-1 text-[11px] uppercase tracking-wide text-muted sm:inline">Required</span>
                        </div>
                        {saved.length > 0 ? (
                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                {saved.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={`rounded-xl border p-3 text-left text-sm transition ${selectedAddressId === String(item.id) ? 'border-ink bg-canvas shadow-soft' : 'border-line hover:border-ink/40'}`}
                                        onClick={() => {
                                            setSelectedAddressId(String(item.id));
                                            setAddress(fromSaved(item));
                                            setFieldErrors({});
                                        }}
                                    >
                                        <span className="font-medium">{item.name}</span>
                                        {item.phone && <span className="mt-0.5 block text-muted">{item.phone}</span>}
                                        <span className="mt-1 block text-muted">{item.line1}, {item.city} {item.postal_code}</span>
                                    </button>
                                ))}
                            </div>
                        ) : user ? (
                            <p className="mt-4 rounded-xl border border-dashed border-line bg-canvas px-4 py-3 text-sm text-muted">
                                No saved address yet. Fill in the form below and we can save it to your account.
                            </p>
                        ) : (
                            <p className="mt-4 rounded-xl border border-dashed border-line bg-canvas px-4 py-3 text-sm text-muted">
                                <Link to={`/login?next=${encodeURIComponent(loginNext)}`} className="font-medium underline">Sign in</Link> to use a saved address.
                            </p>
                        )}
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <Input label="Full name" autoComplete="name" maxLength={80} value={address.name} error={fieldErrors['shipping_address.name']} onChange={(event) => updateAddress('name', event.target.value)} required />
                            <Input
                                type="tel"
                                label="Phone"
                                autoComplete="tel"
                                inputMode="tel"
                                maxLength={20}
                                hint={address.country === 'IN' ? '10-digit Indian mobile number.' : 'Include country code if you are outside India.'}
                                value={address.phone}
                                error={fieldErrors['shipping_address.phone']}
                                onChange={(event) => updateAddress('phone', event.target.value)}
                                required
                            />
                            <Input className="sm:col-span-2" label="Address" autoComplete="street-address" maxLength={255} value={address.line1} error={fieldErrors['shipping_address.line1']} onChange={(event) => updateAddress('line1', event.target.value)} required />
                            <Input className="sm:col-span-2" label="Apartment (optional)" autoComplete="address-line2" maxLength={255} value={address.line2} onChange={(event) => updateAddress('line2', event.target.value)} />
                            <Input label="City" autoComplete="address-level2" maxLength={120} value={address.city} error={fieldErrors['shipping_address.city']} onChange={(event) => updateAddress('city', event.target.value)} required />
                            <Input label="State" autoComplete="address-level1" maxLength={120} value={address.region} onChange={(event) => updateAddress('region', event.target.value)} />
                            <Input label="PIN code" autoComplete="postal-code" inputMode="numeric" maxLength={12} value={address.postal_code} error={fieldErrors['shipping_address.postal_code']} onChange={(event) => updateAddress('postal_code', event.target.value)} required />
                            <Select label="Country" value={address.country} error={fieldErrors['shipping_address.country']} required onChange={(event) => updateAddress('country', event.target.value)}>
                                <option value="IN">India</option>
                                <option value="US">United States</option>
                                <option value="GB">United Kingdom</option>
                                <option value="AE">United Arab Emirates</option>
                            </Select>
                        </div>
                        {user && (
                            <label className="mt-5 flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} />
                                Save this address to my account
                            </label>
                        )}
                    </section>

                    <fieldset className="space-y-3 rounded-2xl border border-line bg-paper p-5 shadow-soft md:p-6">
                        <legend className="px-1 text-sm font-medium">Payment</legend>
                        {methods.map((option) => (
                            <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm transition ${method === option.id ? 'border-ink bg-canvas shadow-soft' : 'border-line hover:border-ink/40'}`}>
                                <input type="radio" name="payment" className="mt-1" checked={method === option.id} onChange={() => setMethod(option.id)} />
                                <Icon name={option.icon || 'credit-card'} className="mt-0.5 h-5 w-5 shrink-0" />
                                <span>
                                    <span className="font-medium">{option.label}</span>
                                    <span className="mt-0.5 block text-muted">{option.description}</span>
                                </span>
                            </label>
                        ))}
                    </fieldset>

                    <Button type="submit" loading={loading} loadingLabel={method === 'cod' ? 'Placing order…' : 'Processing payment…'} className="w-full rounded-full lg:hidden">
                        <Icon name="lock-closed" className="h-4 w-4" />
                        {method === 'cod' ? `Place order · ${money(totals.total)}` : `Pay securely · ${money(totals.total)}`}
                    </Button>
                </form>

                <aside className="h-fit space-y-4 rounded-2xl border border-line bg-paper p-5 text-sm shadow-soft lg:sticky lg:top-28">
                    <h2 className="font-medium">{buyNowId ? 'This order' : 'Order summary'}</h2>
                    <ul className="space-y-3">
                        {checkoutItems.map((item) => {
                            const name = item.variant?.product?.name ?? item.variant?.sku;
                            const image = item.variant?.product?.image_url;
                            return (
                                <li key={item.id} className="flex gap-3">
                                    {image ? (
                                        <img src={image} alt="" className="h-16 w-14 rounded-lg object-cover" />
                                    ) : (
                                        <span className="flex h-16 w-14 items-center justify-center rounded-lg bg-canvas font-display text-xl text-muted">{name?.slice(0, 1)}</span>
                                    )}
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-medium leading-snug">{name}</span>
                                        <span className="text-muted">Qty {item.quantity}</span>
                                    </span>
                                    <span className="shrink-0">{money(item.line_total)}</span>
                                </li>
                            );
                        })}
                    </ul>
                    <dl className="space-y-2 border-t border-line pt-3">
                        <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
                        {totals.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>-{money(totals.discount)}</dd></div>}
                        <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{money(totals.shipping)}</dd></div>
                        <div className="flex justify-between border-t border-line pt-2 font-medium"><dt>Total</dt><dd>{money(totals.total)}</dd></div>
                    </dl>
                    {buyNowId && cart.discount && (
                        <p className="text-xs text-muted">Coupons on your bag apply to this item when you pay.</p>
                    )}
                    <Button type="submit" form="checkout-form" loading={loading} loadingLabel={method === 'cod' ? 'Placing order…' : 'Processing payment…'} className="hidden w-full rounded-full lg:inline-flex">
                        <Icon name="lock-closed" className="h-4 w-4" />
                        {method === 'cod' ? `Place order · ${money(totals.total)}` : `Pay securely · ${money(totals.total)}`}
                    </Button>
                    <Link to="/cart" className="inline-flex items-center gap-1 text-sm underline">
                        <Icon name="arrow-left" className="h-4 w-4" /> {buyNowId ? 'Back to bag' : 'Back to cart'}
                    </Link>
                </aside>
            </div>
        </div>
    );
}
