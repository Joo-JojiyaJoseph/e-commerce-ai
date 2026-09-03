import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAccountOrders, money } from '../api.js';
import { EmptyState } from '../components/common.jsx';
import { AccountShell } from './AccountShell.jsx';

export default function AccountOrders() {
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        getAccountOrders().then((response) => setOrders(response.data ?? []));
    }, []);

    return (
        <AccountShell title="Orders">
            {orders.length === 0 ? (
                <EmptyState
                    title="No orders yet"
                    body="Your orders will appear here after your first purchase."
                    action={<Link to="/shop" className="inline-flex rounded-md bg-ink px-4 py-2.5 text-sm text-white">Start shopping</Link>}
                />
            ) : (
                <div className="space-y-3">
                    {orders.map((order) => (
                        <Link key={order.id} to={`/account/orders/${order.number}`} className="block rounded-2xl border border-line bg-paper p-5 shadow-soft transition hover:border-ink/30">
                            <div className="flex justify-between gap-4">
                                <div>
                                    <p className="font-medium">{order.number}</p>
                                    <p className="text-sm capitalize text-muted">{order.status} · {order.payment_status}</p>
                                    <p className="mt-2 text-sm text-muted">{order.items?.length ?? 0} item(s)</p>
                                </div>
                                <p>{money(order.total)}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </AccountShell>
    );
}
