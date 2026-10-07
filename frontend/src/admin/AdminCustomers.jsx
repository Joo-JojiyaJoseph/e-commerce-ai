import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminGet, money } from '../api.js';
import { ErrorState, PageHeader, Skeleton, StatusBadge } from '../components/common.jsx';
import { Icon } from '../components/icons.jsx';
import FilterBar from './kit/FilterBar.jsx';
import ListBody, { EmptyFiltered } from './kit/ListBody.jsx';
import Pagination from './kit/Pagination.jsx';
import { useAdminList } from './kit/useAdminList.js';

const day = (value) => (value ? new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—');

const FIELDS = [
    { key: 'date_from', label: 'Joined from', type: 'date' },
    { key: 'date_to', label: 'Joined to', type: 'date' },
];

const EXPORT_COLUMNS = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'created_at', label: 'Joined', value: (row) => day(row.created_at) },
];

function initials(name = '') {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
}

export function AdminCustomers() {
    const list = useAdminList('/api/admin/customers');

    return (
        <div className="space-y-5">
            <PageHeader eyebrow="Sales" title="Customers" subtitle="People who have created a store account." />
            <FilterBar list={list} search="Search name or email" fields={FIELDS} exportConfig={{ endpoint: '/api/admin/customers', filename: 'customers', columns: EXPORT_COLUMNS }} />
            <ListBody list={list} empty={<EmptyFiltered list={list} title="No customers yet" body="New accounts will appear here." icon="users" />}>
                <table className="ui-table">
                    <thead><tr><th>Customer</th><th>Joined</th><th /></tr></thead>
                    <tbody>
                        {list.rows.map((user) => (
                            <tr key={user.id}>
                                <td>
                                    <div className="flex items-center gap-3">
                                        <span className="grid h-10 w-10 place-items-center rounded-full bg-accent/10 text-sm font-bold text-accent-dark ring-1 ring-white/70">{initials(user.name)}</span>
                                        <div>
                                            <Link to={`/admin/customers/${user.id}`} className="font-semibold hover:text-accent-dark">{user.name}</Link>
                                            <p className="text-xs text-muted">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="text-muted">{day(user.created_at)}</td>
                                <td className="text-right">
                                    <Link to={`/admin/customers/${user.id}`} className="inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-accent-dark transition hover:bg-accent/10">
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

function Stat({ label, value, icon }) {
    return (
        <div className="hover-lift rounded-3xl border border-line bg-paper p-5 shadow-soft">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent/10 text-accent"><Icon name={icon} className="h-4 w-4" /></span>
                {label}
            </p>
            <p className="mt-3 font-display text-3xl font-extrabold tabular-nums">{value}</p>
        </div>
    );
}

export function AdminCustomerView() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(null);

    function load() {
        setFailed(null);
        return adminGet(`/api/admin/customers/${id}`).then((response) => setData(response.data)).catch(setFailed);
    }

    useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    if (failed) return <ErrorState title="Could not load this customer" body={failed.message} onRetry={load} />;
    if (!data) return <div className="space-y-4"><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-64 rounded-3xl" /></div>;

    const spent = (data.orders ?? []).filter((order) => !['cancelled', 'failed'].includes(order.status)).reduce((sum, order) => sum + Number(order.total), 0);
    const phone = (data.addresses ?? []).find((address) => address.phone)?.phone;

    return (
        <div className="space-y-6">
            <Link to="/admin/customers" className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
                <Icon name="arrow-left" className="h-4 w-4" /> All customers
            </Link>
            <header className="flex flex-wrap items-center gap-4">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent font-display text-2xl font-extrabold text-white shadow-[0_12px_24px_-6px_rgb(109_74_255_/_0.6)]">{initials(data.name)}</span>
                <div>
                    <h1 className="font-display text-3xl md:text-4xl">{data.name}</h1>
                    <p className="mt-1 text-sm text-muted">{data.email}{phone ? ` · ${phone}` : ''} · Joined {day(data.created_at)}</p>
                </div>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Orders" value={data.orders?.length ?? 0} icon="clipboard-document-list" />
                <Stat label="Spent (recent)" value={money(spent)} icon="banknotes" />
                <Stat label="Reviews" value={data.reviews?.length ?? 0} icon="chat-bubble" />
                <Stat label="Wishlist" value={data.wishlist_count ?? 0} icon="heart" />
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,0.8fr)]">
                <section className="rounded-3xl border border-line bg-paper p-5 shadow-soft md:p-6">
                    <h2 className="font-display text-lg">Recent orders</h2>
                    {data.orders?.length ? (
                        <ul className="mt-3 text-sm">
                            {data.orders.map((order) => (
                                <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-900/[0.06] py-3 first:border-t-0">
                                    <div>
                                        <Link to={`/admin/orders/${order.number}`} className="font-semibold hover:text-accent-dark">{order.number}</Link>
                                        <p className="text-xs text-muted">{day(order.created_at)}</p>
                                    </div>
                                    <span className="inline-flex items-center gap-2"><span className="font-medium tabular-nums">{money(order.total)}</span><StatusBadge value={order.status} /></span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-3 text-sm text-muted">No orders yet.</p>
                    )}
                </section>
                <section className="rounded-3xl border border-line bg-paper p-5 text-sm shadow-soft">
                    <h2 className="font-display text-lg">Saved addresses</h2>
                    {data.addresses?.length ? data.addresses.map((address) => (
                        <p key={address.id} className="mt-3 border-t border-slate-900/[0.06] pt-3 leading-6 first:border-t-0 first:pt-0">
                            <span className="font-medium">{address.name}</span><br />
                            <span className="text-muted">{[address.line1, address.city, address.postal_code, address.country].filter(Boolean).join(', ')}</span>
                        </p>
                    )) : <p className="mt-3 text-muted">None saved.</p>}
                </section>
            </div>
        </div>
    );
}
