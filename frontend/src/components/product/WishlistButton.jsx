import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth.jsx';
import { friendlyError } from '../../api.js';
import { useWishlist } from '../../store/wishlist.jsx';
import { useToast } from '../../toast.jsx';
import { Icon } from '../icons.jsx';

export default function WishlistButton({ product, className = '', size = 'md' }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { has, toggle, isPending } = useWishlist();
    const { push } = useToast();
    const [pop, setPop] = useState(false);
    const saved = has(product);
    const busy = isPending(product);
    const iconClass = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

    async function onClick(event) {
        event.preventDefault();
        event.stopPropagation();

        if (!user) {
            push({
                title: 'Sign in to save items',
                message: 'Create an account or sign in to keep products in your wishlist.',
                tone: 'info',
            });
            const next = `${window.location.pathname}${window.location.search}`;
            navigate(`/login?next=${encodeURIComponent(next)}`);
            return;
        }

        try {
            const next = await toggle(product);
            setPop(true);
            window.setTimeout(() => setPop(false), 320);
            push(next
                ? { title: 'Added to wishlist', message: `${product.name ?? 'This product'} has been saved to your wishlist.`, tone: 'success' }
                : { title: 'Removed from wishlist', message: `${product.name ?? 'This product'} has been removed from your wishlist.`, tone: 'info' });
        } catch (error) {
            push({ title: 'Could not update wishlist', message: friendlyError(error), tone: 'error' });
        }
    }

    return (
        <button
            type="button"
            aria-pressed={saved}
            aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
            title={saved ? 'Saved to wishlist' : 'Save to wishlist'}
            disabled={busy}
            onClick={onClick}
            className={`inline-flex items-center justify-center rounded-full bg-paper/95 text-ink shadow-sm transition hover:scale-105 disabled:opacity-50 ${saved ? 'text-accent' : ''} ${className}`}
        >
            <Icon
                name="heart"
                variant={saved ? 'solid' : 'outline'}
                className={`${iconClass} ${pop ? 'heart-pop' : ''}`}
            />
        </button>
    );
}
