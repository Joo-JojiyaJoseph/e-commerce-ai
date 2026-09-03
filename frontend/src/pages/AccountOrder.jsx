import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cancelAccountOrder, friendlyError, getAccountOrder, money } from '../api.js';
import { Button, ShippingAddress, StatusBadge } from '../components/common.jsx';
import OrderTimeline from '../components/OrderTimeline.jsx';
import { useConfirm } from '../feedback.jsx';
import { useToast } from '../toast.jsx';
import { AccountShell } from './AccountShell.jsx';

export default function AccountOrder() {
    const { number } = useParams();
    const { success, error: fail } = useToast();
    const confirm = useConfirm();
    const [order, setOrder] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        getAccountOrder(number)
            .then((response) => {
                setOrder(response.data);
                setTimeline(response.timeline ?? []);
            })
            .catch((caught) => setError(caught.message));
    }, [number]);

    return (
        <AccountShell>
            {error && <p className="text-sm text-red-700">{error}</p>}
            {order && (
                <div className="rounded-2xl border border-line bg-paper p-6 shadow-soft">
                    <p className="text-sm text-muted">Order</p>
                    <h1 className="font-display text-3xl">{order.number}</h1>
                    <p className="mt-1 flex flex-wrap gap-2"><StatusBadge value={order.status} /> <StatusBadge value={order.payment_status} /></p>
                    <OrderTimeline status={order.status} paymentStatus={order.payment_status} events={timeline} />
                    <ShippingAddress address={order.shipping_address} className="mt-6" />
                    <ul className="mt-6 space-y-2 text-sm">
                        {order.items.map((item) => (
                            <li key={item.id} className="flex justify-between">
                                <span>{item.name} × {item.quantity}</span>
                                <span>{money(item.line_total)}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-4 font-medium">Total {money(order.total)}</p>
                    {order.status !== 'cancelled' && order.status !== 'fulfilled' && (
                        <Button
                            type="button"
                            variant="ghost"
                            className="mt-6"
                            onClick={async () => {
                                const ok = await confirm({
                                    title: 'Cancel this order?',
                                    message: 'If fulfilment has not started, this order will be cancelled.',
                                    confirmLabel: 'Cancel order',
                                });
                                if (!ok) {
                                    return;
                                }
                                try {
                                    const { data } = await cancelAccountOrder(order.number);
                                    setOrder(data);
                                    success('Order cancelled', 'This order has been cancelled.');
                                } catch (caught) {
                                    fail('Could not cancel order', friendlyError(caught));
                                }
                            }}
                        >
                            Cancel order
                        </Button>
                    )}
                    <p className="mt-4 text-sm text-muted">
                        Returns after dispatch are not available in this release. Cancel before fulfilment, or write from Contact with your order number.
                    </p>
                    <Link to="/account/orders" className="mt-4 block text-sm underline">All orders</Link>
                </div>
            )}
        </AccountShell>
    );
}
