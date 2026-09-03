export function relativeTime(value) {
    if (!value) {
        return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const seconds = Math.round((Date.now() - date.getTime()) / 1000);

    if (seconds < 45) {
        return 'Just now';
    }

    if (seconds < 3600) {
        const minutes = Math.max(1, Math.round(seconds / 60));
        return `${minutes} min ago`;
    }

    if (seconds < 86400) {
        const hours = Math.max(1, Math.round(seconds / 3600));
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }

    const days = Math.round(seconds / 86400);

    if (days < 7) {
        return `${days} day${days === 1 ? '' : 's'} ago`;
    }

    return date.toLocaleDateString();
}

export function safeNextPath(value, fallback = '/account') {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
        return fallback;
    }

    return value;
}

export function productKey(product) {
    return Number(product?.id ?? product);
}
