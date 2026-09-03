import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminGet, money } from '../api.js';
import { Button, EmptyState, Input, PageHeader, Skeleton, StatusBadge, TableShell } from '../components/common.jsx';

export function AdminCustomers() {
    const [payload, setPayload] = useState(null);
    const [q, setQ] = useState('');

    function load() {
        const search = q ? `?q=${encodeURIComponent(q)}` : '';
        return adminGet(`/api/admin/customers${search}`).then(setPayload);
    }

    useEffect(() => {
        load();
    }, []);

    const rows = payload?.data ?? [];

    return (
        <div className="space-y-5">
            <PageHeader eyebrow="Sales" title="Customers" subtitle="People who have created a store account." />
            <form className="admin-toolbar" onSubmit={(event) => { event.preventDefault(); load(); }}>
                <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Name or email" className="min-w-56 flex-1" />
                <Button type="submit">Search</Button>
            </form>
            <TableShell empty={Boolean(payload) && rows.length === 0} emptyState={<EmptyState title="No customers" body="New accounts will appear here." icon="users" />}>
                <table className="ui-table">
                    <thead><tr><th>Name</th><th>Email</th><th /></tr></thead>
                    <tbody>
                        {rows.map((user) => (
                            <tr key={user.id}>
                                <td className="font-medium">{user.name}</td>
                                <td className="text-muted">{user.email}</td>
                                <td className="text-right"><Link className="cursor-pointer text-sm font-medium underline" to={`/admin/customers/${user.id}`}>View</Link></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableShell>
        </div>
    );
}

export function AdminCustomerView() {
    const { id } = useParams();
    const [payload, setPayload] = useState(null);

    useEffect(() => {
        adminGet(`/api/admin/customers/${id}`).then(({ data }) => setPayload(data));
    }, [id]);

    if (!payload) {
        return <Skeleton className="h-48" />;
    }

    return (
        <div className="space-y-6">
            <PageHeader title={payload.name} subtitle={payload.email} />
            <section className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
                <h2 className="font-medium">Orders</h2>
                {payload.orders?.length ? (
                    <ul className="mt-2 text-sm">
                        {payload.orders.map((order) => (
                            <li key={order.id} className="flex justify-between border-t border-line py-2">
                                <Link to={`/admin/orders/${order.number}`} className="cursor-pointer font-medium underline">{order.number}</Link>
                                <span className="inline-flex items-center gap-2">{money(order.total)} <StatusBadge value={order.status} /></span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-2 text-sm text-muted">No orders yet.</p>
                )}
            </section>
        </div>
    );
}
