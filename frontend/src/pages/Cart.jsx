import { Link } from 'react-router-dom';
import { CartLine, CartSummary } from '../components/cart/CartDrawer.jsx';
import { Button, EmptyState, PageHeader, Skeleton } from '../components/common.jsx';
import { useCart } from '../store/cart.jsx';

export default function Cart() {
    const { cart } = useCart();

    if (!cart) {
        return <Skeleton className="h-48" />;
    }

    if (!cart.items?.length) {
        return (
            <EmptyState
                title="Your cart is empty"
                body="Browse the floor and add a piece. Your bag stays in this browser until checkout."
                action={<Button as={Link} to="/shop">Start shopping</Button>}
                icon="shopping-bag"
            />
        );
    }

    return (
        <div>
            <PageHeader
                title="Your bag"
                subtitle={`${cart.items.length} item${cart.items.length === 1 ? '' : 's'} ready for checkout.`}
            />
            <div className="grid gap-8 lg:grid-cols-3">
                <div className="h-fit rounded-2xl border border-line bg-paper px-4 shadow-soft lg:col-span-2">
                    {cart.items.map((item) => <CartLine key={item.id} item={item} />)}
                </div>
                <CartSummary cart={cart} />
            </div>
        </div>
    );
}
