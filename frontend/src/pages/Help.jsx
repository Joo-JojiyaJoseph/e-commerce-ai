import { Link } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';

const topics = [
    ['clipboard-document-list', 'Orders', 'Track from Account → Orders. Guest checkout still shows a confirmation page with the order number.'],
    ['arrow-path', 'Returns', 'Cancel before fulfilment on the order page. Contact us with the order number if something arrived damaged.'],
    ['lock-closed', 'Payments', 'Checkout charges through the configured gateway. Failed payments never create a paid order.'],
    ['sparkles', 'Coupons', 'Try WELCOME10 at checkout for 10% off, when the code is active.'],
    ['magnifying-glass', 'Search', 'Type in the header. Suggestions appear as you type. Filters stay in the URL so you can share a result set.'],
    ['shopping-bag', 'Buy now', 'Buy now adds the piece to your bag, then checks out that item only. Everything else stays in the cart.'],
];

export default function Help() {
    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Support</p>
                <h1 className="font-display text-4xl">Help</h1>
                <p className="mt-2 text-sm text-muted">Short answers for orders, payments, and the bag. Still stuck? <Link to="/contact" className="underline">Write to us</Link>.</p>
            </div>
            {topics.map(([icon, title, body]) => (
                <article key={title} className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
                    <h2 className="flex items-center gap-2 font-medium">
                        <Icon name={icon} className="h-5 w-5 text-muted" />
                        {title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
                </article>
            ))}
        </div>
    );
}
