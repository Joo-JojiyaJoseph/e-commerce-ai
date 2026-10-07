export const TIMELINE_STEPS = [
    { key: 'placed', label: 'Order placed' },
    { key: 'paid', label: 'Payment confirmed' },
    { key: 'processing', label: 'Processing' },
    { key: 'packed', label: 'Packed' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'out_for_delivery', label: 'Out for delivery' },
    { key: 'delivered', label: 'Delivered' },
];

export function timelineIndex(status, paymentStatus) {
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
    const active = timelineIndex(status, paymentStatus);
    const stopped = status === 'cancelled' || status === 'failed';

    return (
        <ol className="mt-6">
            {TIMELINE_STEPS.map((step, index) => {
                const done = !stopped && index <= active;
                const current = !stopped && index === active;

                return (
                    <li key={step.key} className="relative flex gap-3 pb-5 text-sm last:pb-0">
                        {index < TIMELINE_STEPS.length - 1 && (
                            <span className={`absolute left-[7px] top-4 h-full w-0.5 ${!stopped && index < active ? 'bg-accent' : 'bg-slate-900/10'}`} aria-hidden="true" />
                        )}
                        <span
                            className={`relative mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ring-4 ring-white/60 ${done ? 'bg-accent' : 'bg-slate-300'} ${current ? 'shadow-[0_0_0_4px_rgb(109_74_255_/_0.25)]' : ''}`}
                        >
                            {done && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </span>
                        <div>
                            <p className={done ? 'font-semibold' : 'text-muted'}>{step.label}</p>
                            {events[index] && <p className="text-xs text-muted">{events[index].note}</p>}
                        </div>
                    </li>
                );
            })}
            {(status === 'cancelled' || paymentStatus === 'refunded') && (
                <li className="mt-4 rounded-xl border border-red-200 bg-red-50/70 px-3 py-2 text-sm text-red-700">
                    This order was cancelled. Refund status: {paymentStatus}.
                </li>
            )}
        </ol>
    );
}
