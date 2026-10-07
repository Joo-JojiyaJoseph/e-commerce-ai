import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminGet, adminSend, money } from '../api.js';
import { Button, EmptyState, ErrorState, PageHeader, ShippingAddress, Skeleton, StatusBadge } from '../components/common.jsx';
import { Icon } from '../components/icons.jsx';
import OrderTimeline from '../components/OrderTimeline.jsx';
import { useConfirm } from '../feedback.jsx';
import { useToast } from '../toast.jsx';
import FilterBar from './kit/FilterBar.jsx';
import ListBody, { EmptyFiltered } from './kit/ListBody.jsx';
import Pagination from './kit/Pagination.jsx';
import { useAdminList } from './kit/useAdminList.js';

const STATUSES = ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
const label = (value) => String(value ?? '').replaceAll('_', ' ');
const when = (value) => (value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '');

const FIELDS = [
    { key: 'status', label: 'Order status', type: 'select', options: [...STATUSES, 'paid', 'failed', 'fulfilled', 'returned'].map((value) => ({ value, label: label(value) })) },
    { key: 'payment_status', label: 'Payment', type: 'select', options: ['pending', 'completed', 'failed', 'refunded'].map((value) => ({ value, label: value })) },
    { key: 'gateway', label: 'Method', type: 'select', options: [['cod', 'Cash on delivery'], ['razorpay', 'Razorpay'], ['paypal', 'PayPal'], ['stripe', 'Stripe'], ['fake', 'Test gateway']].map(([value, text]) => ({ value, label: text })) },
    { key: 'date_from', label: 'From date', type: 'date' },
    { key: 'date_to', label: 'To date', type: 'date' },
    { key: 'min_total', label: 'Min total', type: 'number', placeholder: '0' },
    { key: 'max_total', label: 'Max total', type: 'number', placeholder: 'No limit' },
];

const EXPORT_COLUMNS = [
    { key: 'number', label: 'Order' },
    { key: 'created_at', label: 'Placed at', value: (row) => when(row.created_at) },
    { key: 'customer_email', label: 'Customer email' },
    { key: 'name', label: 'Ship to', value: (row) => row.shipping_address?.name },
    { key: 'phone', label: 'Phone', value: (row) => row.shipping_address?.phone },
    { key: 'status', label: 'Status', value: (row) => label(row.status) },
    { key: 'payment_status', label: 'Payment status' },
    { key: 'payment_gateway', label: 'Method' },
    { key: 'subtotal', label: 'Subtotal', numeric: true },
    { key: 'discount_total', label: 'Discount', numeric: true },
    { key: 'shipping_total', label: 'Shipping', numeric: true },
    { key: 'tax_total', label: 'Tax', numeric: true },
    { key: 'total', label: 'Total', numeric: true },
    { key: 'currency', label: 'Currency' },
];

export function AdminOrders() {
    const list = useAdminList('/api/admin/orders');

    return (
        <div className="space-y-5">
            <PageHeader eyebrow="Sales" title="Orders" subtitle="Search, filter and fulfil orders. Export exactly what you've filtered." />
            <FilterBar
                list={list}
                search="Search order number, customer or email"
                fields={FIELDS}
                exportConfig={{ endpoint: '/api/admin/orders', filename: 'orders', columns: EXPORT_COLUMNS }}
            />
            <ListBody list={list} empty={<EmptyFiltered list={list} title="No orders yet" body="New checkouts will appear here." icon="clipboard-document-list" />}>
                <table className="ui-table">
                    <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Payment</th><th className="text-right">Total</th><th /></tr></thead>
                    <tbody>
                        {list.rows.map((order) => (
                            <tr key={order.id}>
                                <td>
                                    <Link to={`/admin/orders/${order.number}`} className="font-semibold hover:text-accent-dark">{order.number}</Link>
                                    <p className="text-xs text-muted">{when(order.created_at)}</p>
                                </td>
                                <td>
                                    <p className="font-medium">{order.shipping_address?.name ?? 'Guest'}</p>
                                    <p className="text-xs text-muted">{order.customer_email ?? order.shipping_address?.phone ?? ''}</p>
                                </td>
                                <td><StatusBadge value={order.status} /></td>
                                <td>
                                    <StatusBadge value={order.payment_status} />
                                    <p className="mt-1 text-xs uppercase tracking-wide text-muted">{order.payment_gateway}</p>
                                </td>
                                <td className="text-right font-semibold tabular-nums">{money(order.total)}</td>
                                <td className="text-right">
                                    <Link to={`/admin/orders/${order.number}`} className="inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-accent-dark transition hover:bg-accent/10">
                                        Open <Icon name="arrow-right" className="h-4 w-4" />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ListBody>
            <Pagination list={list} />
        </div>
    );
}

function WhatsAppPanel({ number }) {
    const { success, error } = useToast();
    const [info, setInfo] = useState(null);
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        adminGet(`/api/admin/orders/${number}/whatsapp`)
            .then(({ data }) => { setInfo(data); setMessage(data.message); })
            .catch(() => setInfo({ link: null }));
    }, [number]);

    if (!info) return <Skeleton className="h-28 rounded-3xl" />;

    const link = info.link ? `https://wa.me/${info.phone}?text=${encodeURIComponent(message)}` : null;

    async function send() {
        setSending(true);
        try {
            await adminSend(`/api/admin/orders/${number}/whatsapp`, { message });
            success('WhatsApp message sent');
        } catch (caught) {
            error('Could not send on WhatsApp', caught.message);
        } finally {
            setSending(false);
        }
    }

    return (
        <section className="no-print rounded-3xl border border-line bg-paper p-5 shadow-soft">
            <h2 className="flex items-center gap-2 font-display text-base">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#25D366]/15 text-[#128C7E]"><Icon name="chat-bubble" className="h-4 w-4" /></span>
                WhatsApp customer
            </h2>
            {!info.link ? (
                <p className="mt-3 text-sm text-muted">There is no valid phone number on this order, so WhatsApp can't be opened.</p>
            ) : (
                <>
                    <label className="mt-3 block text-xs font-medium text-muted">
                        Message
                        <textarea
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            rows={4}
                            maxLength={1000}
                            className="mt-1 w-full rounded-xl border border-slate-900/10 bg-white p-3 text-sm text-ink outline-none"
                        />
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <a href={link} target="_blank" rel="noopener noreferrer" className="btn-shine inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgb(37_211_102_/_0.7)] transition hover:-translate-y-0.5">
                            <Icon name="send" className="h-4 w-4" /> Open in WhatsApp
                        </a>
                        {info.api_configured && (
                            <Button type="button" variant="ghost" loading={sending} loadingLabel="Sending…" onClick={send}>Send automatically</Button>
                        )}
                    </div>
                    {!info.api_configured && (
                        <p className="mt-2 text-xs text-muted">Opens WhatsApp with this message ready to send. To send without leaving the admin, add your WhatsApp Cloud API keys in <Link to="/admin/integrations" className="font-medium text-accent-dark underline">Integrations</Link>.</p>
                    )}
                </>
            )}
        </section>
    );
}

export function AdminOrderView() {
    const { number } = useParams();
    const confirm = useConfirm();
    const { success, error } = useToast();
    const [payload, setPayload] = useState(null);
    const [failed, setFailed] = useState(null);
    const [status, setStatus] = useState('');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    function load() {
        return adminGet(`/api/admin/orders/${number}`)
            .then((response) => { setPayload(response); setStatus(response.data.status); setFailed(null); })
            .catch(setFailed);
    }

    useEffect(() => { load(); }, [number]); // eslint-disable-line react-hooks/exhaustive-deps

    if (failed) return <ErrorState title="Could not load this order" body={failed.message} onRetry={load} />;
    if (!payload) return <div className="space-y-4"><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></div>;

    const order = payload.data;
    const customer = payload.customer;
    const cancelled = order.status === 'cancelled';
    const rows = [
        ['Subtotal', order.subtotal],
        ['Discount', order.discount_total && Number(order.discount_total) > 0 ? `-${order.discount_total}` : null],
        ['Shipping', order.shipping_total],
        ['Tax', order.tax_total && Number(order.tax_total) > 0 ? order.tax_total : null],
    ].filter(([, value]) => value !== null && value !== undefined);

    async function updateStatus(event) {
        event.preventDefault();
        setSaving(true);
        try {
            await adminSend(`/api/admin/orders/${order.number}/status`, { status, note }, 'PATCH');
            setNote('');
            success('Order updated', `Now ${label(status)}.`);
            await load();
        } catch (caught) {
            error('Could not update order', caught.message);
        } finally {
            setSaving(false);
        }
    }

    async function cancelOrder() {
        const ok = await confirm({ title: 'Cancel this order?', message: 'Stock is returned and the customer is notified. This cannot be undone.', confirmLabel: 'Cancel order' });
        if (!ok) return;
        try {
            await adminSend(`/api/admin/orders/${order.number}/cancel`);
            success('Order cancelled');
            await load();
        } catch (caught) {
            error('Could not cancel order', caught.message);
        }
    }

    return (
        <div className="space-y-6">
            <Link to="/admin/orders" className="no-print inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
                <Icon name="arrow-left" className="h-4 w-4" /> All orders
            </Link>

            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="font-display text-3xl md:text-4xl">{order.number}</h1>
                        <StatusBadge value={order.status} />
                        <StatusBadge value={order.payment_status} />
                    </div>
                    <p className="mt-2 text-sm text-muted">
                        Placed {when(order.created_at)} · {customer?.email ?? 'Guest checkout'} · <span className="uppercase">{order.payment_gateway}</span>
                    </p>
                </div>
                <div className="no-print flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => window.print()}><Icon name="print" className="h-4 w-4" /> Print invoice</Button>
                </div>
            </header>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
                <div className="space-y-6">
                    <section className="rounded-3xl border border-line bg-paper p-5 shadow-soft md:p-6">
                        <h2 className="font-display text-lg">Items</h2>
                        <div className="mt-3 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-left text-xs uppercase tracking-wider text-muted">
                                    <tr><th className="pb-2 font-semibold">Product</th><th className="pb-2 text-right font-semibold">Qty</th><th className="pb-2 text-right font-semibold">Price</th><th className="pb-2 text-right font-semibold">Total</th></tr>
                                </thead>
                                <tbody>
                                    {order.items?.map((item) => (
                                        <tr key={item.id} className="border-t border-slate-900/[0.06]">
                                            <td className="py-3 pr-3"><p className="font-medium">{item.name}</p>{item.sku && <p className="text-xs text-muted">SKU {item.sku}</p>}</td>
                                            <td className="py-3 text-right tabular-nums">{item.quantity}</td>
                                            <td className="py-3 text-right tabular-nums">{money(item.unit_price)}</td>
                                            <td className="py-3 text-right font-medium tabular-nums">{money(item.line_total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <dl className="mt-3 space-y-1.5 border-t border-slate-900/[0.06] pt-3 text-sm">
                            {rows.map(([name, value]) => (
                                <div key={name} className="flex justify-between text-muted"><dt>{name}</dt><dd className="tabular-nums">{String(value).startsWith('-') ? `-${money(String(value).slice(1))}` : money(value)}</dd></div>
                            ))}
                            <div className="flex justify-between pt-1 font-display text-lg"><dt>Total</dt><dd className="tabular-nums">{money(order.total)}</dd></div>
                        </dl>
                    </section>

                    <form onSubmit={updateStatus} className="no-print rounded-3xl border border-line bg-paper p-5 shadow-soft md:p-6">
                        <h2 className="font-display text-lg">Fulfilment</h2>
                        <div className="mt-3 flex flex-wrap items-end gap-3">
                            <label className="block text-sm">
                                <span className="mb-1.5 block font-medium">Status</span>
                                <select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)} className="cursor-pointer rounded-xl border border-slate-900/10 bg-white px-3 py-2.5 text-sm capitalize">
                                    {STATUSES.map((value) => <option key={value} value={value}>{label(value)}</option>)}
                                </select>
                            </label>
                            <label className="block min-w-48 flex-1 text-sm">
                                <span className="mb-1.5 block font-medium">Note <span className="font-normal text-muted">(optional, shown on the timeline)</span></span>
                                <input aria-label="Note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder="e.g. Handed to courier" className="w-full rounded-xl border border-slate-900/10 bg-white px-3.5 py-2.5 text-sm" />
                            </label>
                            <Button type="submit" loading={saving} loadingLabel="Saving…" disabled={status === order.status && !note}>Update status</Button>
                            {!cancelled && <Button type="button" variant="danger" onClick={cancelOrder}>Cancel order</Button>}
                        </div>
                    </form>
                </div>

                <aside className="space-y-6 lg:sticky lg:top-6">
                    <section className="rounded-3xl border border-line bg-paper p-5 shadow-soft">
                        <h2 className="font-display text-lg">Progress</h2>
                        <OrderTimeline status={order.status} paymentStatus={order.payment_status} events={payload.timeline ?? []} />
                    </section>
                    {customer && (
                        <section className="rounded-3xl border border-line bg-paper p-5 text-sm shadow-soft">
                            <h2 className="font-display text-lg">Customer</h2>
                            <p className="mt-2 font-medium">{customer.name}</p>
                            <p className="text-muted">{customer.email}</p>
                            <Link to={`/admin/customers/${customer.id}`} className="no-print mt-2 inline-block font-medium text-accent-dark hover:underline">View customer →</Link>
                        </section>
                    )}
                    <ShippingAddress address={order.shipping_address} />
                    <WhatsAppPanel key={order.status} number={order.number} />
                </aside>
            </div>
        </div>
    );
}
