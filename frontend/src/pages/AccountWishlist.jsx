import { Link } from 'react-router-dom';
import { friendlyError, getProduct } from '../api.js';
import { Button, EmptyState } from '../components/common.jsx';
import { ProductGrid } from '../components/product/ProductCard.jsx';
import { useConfirm } from '../feedback.jsx';
import { useCart } from '../store/cart.jsx';
import { useWishlist } from '../store/wishlist.jsx';
import { useToast } from '../toast.jsx';
import { AccountShell } from './AccountShell.jsx';

export default function AccountWishlist() {
    const { products, remove } = useWishlist();
    const { addItem } = useCart();
    const { success, error } = useToast();
    const confirm = useConfirm();

    return (
        <AccountShell title="Wishlist">
            {products.length === 0 ? (
                <EmptyState
                    title="Your wishlist is empty"
                    body="Save products you love and find them here later."
                    icon="heart"
                    action={<Button as={Link} to="/shop">Continue shopping</Button>}
                />
            ) : (
                <>
                    <ProductGrid products={products} />
                    <div className="mt-4 space-y-2 text-sm">
                        {products.map((product) => (
                            <div key={`actions-${product.id}`} className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    className="underline"
                                    onClick={async () => {
                                        try {
                                            if (product.variant_id) {
                                                await addItem(product.variant_id, 1);
                                            } else {
                                                const { data } = await getProduct(product.slug);
                                                if (data.variants[0]) {
                                                    await addItem(data.variants[0].id, 1);
                                                }
                                            }
                                            success('Added to cart', `${product.name} has been added to your cart.`);
                                        } catch (caught) {
                                            error('Could not add to cart', friendlyError(caught));
                                        }
                                    }}
                                >
                                    Move {product.name} to cart
                                </button>
                                <button
                                    type="button"
                                    className="text-danger"
                                    onClick={async () => {
                                        const ok = await confirm({
                                            title: 'Remove from wishlist?',
                                            message: `Are you sure you want to remove ${product.name}?`,
                                            confirmLabel: 'Remove',
                                        });
                                        if (!ok) {
                                            return;
                                        }
                                        try {
                                            await remove(product.id);
                                            success('Removed from wishlist', `${product.name} has been removed from your wishlist.`);
                                        } catch (caught) {
                                            error('Could not update wishlist', friendlyError(caught));
                                        }
                                    }}
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </AccountShell>
    );
}
