import { money } from '../../api.js';
import { Icon } from '../icons.jsx';

export function ProductPrice({ price, compareAt, className = '' }) {
    const discount = Number(compareAt) > Number(price)
        ? Math.round((1 - Number(price) / Number(compareAt)) * 100)
        : 0;

    return (
        <div className={`flex flex-wrap items-baseline gap-2 ${className}`}>
            <span className="font-medium">{price ? money(price) : 'See options'}</span>
            {discount > 0 && <span className="text-sm text-muted line-through">{money(compareAt)}</span>}
            {discount > 0 && <span className="text-xs font-medium text-accent">{discount}% off</span>}
        </div>
    );
}

export function ProductRating({ value = 0, count = 0, compact = false }) {
    if (!count) {
        return compact ? null : <p className="text-xs text-muted">No reviews yet</p>;
    }

    return (
        <p className="flex items-center gap-1 text-xs text-muted">
            <Icon name="star" variant="solid" className="h-3.5 w-3.5 text-accent" />
            {Number(value).toFixed(1)} · {count} review{count === 1 ? '' : 's'}
        </p>
    );
}
