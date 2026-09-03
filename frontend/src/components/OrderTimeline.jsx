const STEPS = [
    { key: 'placed', label: 'Order placed' },
    { key: 'paid', label: 'Payment confirmed' },
    { key: 'processing', label: 'Processing' },
    { key: 'packed', label: 'Packed' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'out_for_delivery', label: 'Out for delivery' },
    { key: 'delivered', label: 'Delivered' },
];

function currentIndex(status, paymentStatus) {
    const byStatus = {
        pending: 0,
        confirmed: 0,
        paid: 2,
        processing: 2,
        packed: 3,
        shipped: 4,
        out_for_delivery: 5,
        delivered: 6,
        fulfilled: 6,
    };

    if (status === 'cancelled' || status === 'failed') {
        return 0;
    }

    if (status in byStatus) {
        if (status === 'confirmed' && paymentStatus === 'completed') {
            return 2;
        }

        return byStatus[status];
    }

    if (paymentStatus === 'completed') {
        return 2;
    }

    return 1;
}

export default function OrderTimeline({ status, paymentStatus, events = [] }) {
    const active = currentIndex(status, paymentStatus);

    return (
        <ol className="mt-6 space-y-3">
            {STEPS.map((step, index) => (
                <li key={step.key} className="flex gap-3 text-sm">
                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${index <= active ? 'bg-clay' : 'bg-line'}`} />
                    <div>
                        <p className={index <= active ? 'font-medium' : 'text-muted'}>{step.label}</p>
                        {events[index] && <p className="text-xs text-muted">{events[index].note}</p>}
                    </div>
                </li>
            ))}
            {(status === 'cancelled' || paymentStatus === 'refunded') && (
                <li className="text-sm text-red-700">This order was cancelled. Refund status: {paymentStatus}.</li>
            )}
        </ol>
    );
}
