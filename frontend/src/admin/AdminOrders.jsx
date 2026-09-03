import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminGet, adminSend, money } from '../api.js';
import { Button, EmptyState, Input, PageHeader, ShippingAddress, StatusBadge, TableShell } from '../components/common.jsx';
import OrderTimeline from '../components/OrderTimeline.jsx';

export function AdminOrders() {
    const [payload, setPayload] = useState(null);
    const [q, setQ] = useState('');

    function load() {
        const search = q ? `?q=${encodeURIComponent(q)}` : '';
        return adminGet(`/api/admin/orders${search}`).then(setPayload);
    }

    useEffect(() => {
        load();
    }, []);

    return (
        <div className="space-y-5">
            <PageHeader eyebrow="Sales" title="Orders" subtitle="Search by order number and update fulfilment." />
            <form className="admin-toolbar" onSubmit={(event) => { event.preventDefault(); load(); }}>
                <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Order number" className="min-w-56 flex-1" />
                <Button type="submit">Search</Button>
            </form>
            <TableShell empty={Boolean(payload) && (payload.data ?? []).length === 0} emptyState={<EmptyState title="No orders" body="New checkouts will appear here." icon="clipboard-document-list" />}>
            <table className="ui-table">
                <thead><tr><th>Number</th><th>Status</th><th>Payment</th><th>Total</th><th /></tr></thead>
                <tbody>
                        {(payload?.data ?? []).map((order) => (
                            <tr key={order.id}>
                                <td className="font-medium">{order.number}</td>
                                <td><StatusBadge value={order.status} /></td>
                                <td><StatusBadge value={order.payment_status} /></td>
                                <td>{money(order.total)}</td>
                                <td className="text-right"><Link className="cursor-pointer text-sm font-medium underline" to={`/admin/orders/${order.number}`}>View</Link></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableShell>
        </div>
    );
}

const STATUSES = ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];

export function AdminOrderView() {
    const { number } = useParams();
    const [payload, setPayload] = useState(null);

    function load() {
        return adminGet(`/api/admin/orders/${number}`).then(setPayload);
    }

    useEffect(() => {
        load();
    }, [number]);

    if (!payload) {
        return <p className="text-sm text-muted">Loading…</p>;
    }

    const order = payload.data;

    return (
        <div className="space-y-6">
            <PageHeader title={order.number} subtitle={`${payload.customer?.email ?? 'Guest'} · ${order.payment_gateway}`} />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
                <div className="space-y-6">
                    <OrderTimeline status={order.status} paymentStatus={order.payment_status} events={payload.timeline ?? []} />
                    <ul className="rounded-2xl border border-line bg-paper p-5 text-sm">
                        {order.items?.map((item) => (
                            <li key={item.id} className="flex justify-between gap-4 border-t border-line py-2 first:border-t-0 first:pt-0">
                                <span>{item.name} × {item.quantity}</span>
                                <span className="shrink-0">{money(item.line_total)}</span>
                            </li>
                        ))}
                        <li className="flex justify-between border-t border-line pt-3 font-medium">
                            <span>Total</span>
                            <span>{money(order.total)}</span>
                        </li>
                    </ul>
                </div>
                <ShippingAddress address={order.shipping_address} className="h-fit" />
            </div>
            <form
                className="flex flex-wrap items-end gap-2 rounded-2xl border border-line bg-paper p-4 shadow-soft"
                onSubmit={async (event) => {
                    event.preventDefault();
                    await adminSend(`/api/admin/orders/${order.number}/status`, {
                        status: event.target.status.value,
                        note: event.target.note.value,
                    }, 'PATCH');
                    load();
                }}
            >
                <label className="block text-sm">
                    <span className="mb-1.5 block font-medium">Status</span>
                    <select name="status" defaultValue={order.status} className="cursor-pointer rounded-lg border border-line bg-white px-3 py-2.5 text-sm">
                        {STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
                    </select>
                </label>
                <Input name="note" placeholder="Note" className="min-w-48 flex-1" />
                <Button type="submit">Update status</Button>
                <Button type="button" variant="danger" onClick={() => adminSend(`/api/admin/orders/${order.number}/cancel`).then(load)}>Cancel order</Button>
            </form>
        </div>
    );
}
