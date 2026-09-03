import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { confirmPayment, getAccountOrder, getOrder, money } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Button, ShippingAddress, Skeleton, StatusBadge } from '../components/common.jsx';
import { Icon } from '../components/icons.jsx';
import OrderTimeline from '../components/OrderTimeline.jsx';

export default function OrderConfirmation() {
    const { number } = useParams();
    const [params] = useSearchParams();
    const { user } = useAuth();
    const [order, setOrder] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [error, setError] = useState(null);
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        if (!number) {
            return;
        }

        const gateway = params.get('gateway');
        const sessionId = params.get('session_id');
        const paypalToken = params.get('token');

        async function load() {
            if (gateway === 'stripe' && sessionId) {
                setConfirming(true);
                await confirmPayment({ order_number: number, session_id: sessionId });
            }

            if (gateway === 'paypal' && (paypalToken || sessionId)) {
                setConfirming(true);
                await confirmPayment({ order_number: number, paypal_order_id: paypalToken, token: paypalToken });
            }

            const loader = user ? getAccountOrder(number) : getOrder(number);
            const response = await loader;
            setOrder(response.data);
            setTimeline(response.timeline ?? []);
        }

        load()
            .catch((caught) => setError(caught.message))
            .finally(() => setConfirming(false));
    }, [number, user, params]);

    if (error) {
        return <p className="text-sm text-red-700">{error}</p>;
    }

    if (!order || confirming) {
        return <Skeleton className="mx-auto h-64 max-w-xl" />;
    }

    const paid = order.payment_status === 'completed' || order.payment_gateway === 'cod';

    return (
        <div className="mx-auto max-w-xl space-y-6 rounded-3xl border border-line bg-paper p-8 shadow-soft">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-forest">
                <Icon name={paid ? 'check-circle' : 'arrow-path'} className="h-5 w-5" />
                {paid ? 'Order placed' : 'Payment pending'}
            </p>
            <div>
                <h1 className="font-display text-3xl">{order.number}</h1>
                <p className="mt-2 flex flex-wrap gap-2 text-sm text-muted">
                    <StatusBadge value={order.payment_status} />
                    via {order.payment_gateway} · {money(order.total)}
                </p>
            </div>
            <OrderTimeline status={order.status} paymentStatus={order.payment_status} events={timeline} />
            <ShippingAddress address={order.shipping_address} />
            <ul className="space-y-2 text-sm">
                {order.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3 border-t border-line py-2">
                        <span>{item.name} × {item.quantity}</span>
                        <span>{money(item.line_total)}</span>
                    </li>
                ))}
            </ul>
            <div className="flex flex-wrap gap-3">
                <Button as={Link} to="/shop" variant="ghost" className="rounded-full">Continue shopping</Button>
                {user && <Button as={Link} to={`/account/orders/${order.number}`} className="rounded-full">Track order</Button>}
            </div>
        </div>
    );
}
