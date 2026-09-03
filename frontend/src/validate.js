function text(value) {
    return String(value ?? '').trim();
}

export function required(value, label) {
    if (!text(value)) {
        return `${label} is required.`;
    }

    return null;
}

export function maxLen(value, limit, label) {
    if (text(value).length > limit) {
        return `${label} must be ${limit} characters or fewer.`;
    }

    return null;
}

export function minLen(value, limit, label) {
    if (text(value).length < limit) {
        return `${label} must be at least ${limit} characters.`;
    }

    return null;
}

export function email(value) {
    const next = text(value).toLowerCase();

    if (!next) {
        return 'Email is required.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next) || next.length > 255) {
        return 'Enter a valid email address.';
    }

    return null;
}

export function personName(value) {
    const next = text(value);

    if (!next) {
        return 'Name is required.';
    }

    if (next.length < 2 || next.length > 80) {
        return 'Enter a name between 2 and 80 characters.';
    }

    if (!/^[\p{L}\s.'-]+$/u.test(next)) {
        return 'Name can only include letters, spaces, and punctuation.';
    }

    return null;
}

export function password(value, { min = 8, max = 72 } = {}) {
    const next = String(value ?? '');

    if (next.length < min) {
        return `Password must be at least ${min} characters.`;
    }

    if (next.length > max) {
        return `Password must be ${max} characters or fewer.`;
    }

    return null;
}

export function confirmPassword(value, other) {
    if (value !== other) {
        return 'Passwords do not match.';
    }

    return null;
}

export function phone(value, { required: must = false, country = '' } = {}) {
    const next = text(value);

    if (!next) {
        return must ? 'Phone number is required.' : null;
    }

    const digits = next.replace(/\D/g, '');
    const code = text(country).toUpperCase();

    if (code === 'IN') {
        const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;

        if (!/^[6-9]\d{9}$/.test(local)) {
            return 'Enter a 10-digit Indian mobile number.';
        }

        return null;
    }

    if (digits.length < 8 || digits.length > 15 || !/^[+]?[\d\s()-]{8,20}$/.test(next)) {
        return 'Enter a valid phone number.';
    }

    return null;
}

export function countryCode(value) {
    const next = text(value).toUpperCase();

    if (!/^[A-Z]{2}$/.test(next)) {
        return 'Use a 2-letter country code, such as IN.';
    }

    return null;
}

export function postalCode(value, country = 'IN') {
    const next = text(value);
    const code = text(country).toUpperCase();

    if (!next) {
        return 'PIN / postal code is required.';
    }

    if (code === 'IN' && !/^\d{6}$/.test(next)) {
        return 'Enter a 6-digit PIN code.';
    }

    if (!/^[A-Za-z0-9\s-]{3,12}$/.test(next)) {
        return 'Enter a valid postal code.';
    }

    return null;
}

export function city(value) {
    return required(value, 'City') || maxLen(value, 120, 'City');
}

export function pick(map) {
    return Object.fromEntries(Object.entries(map).filter(([, message]) => Boolean(message)));
}

export function hasErrors(map) {
    return Object.keys(map).length > 0;
}

export function addressErrors(address, { includePhone = false, requirePhone = false } = {}) {
    return pick({
        name: personName(address.name),
        line1: required(address.line1, 'Address') || maxLen(address.line1, 255, 'Address'),
        city: city(address.city),
        postal_code: postalCode(address.postal_code, address.country),
        country: countryCode(address.country),
        ...(includePhone || requirePhone ? { phone: phone(address.phone, { required: requirePhone, country: address.country }) } : {}),
    });
}

export function flattenErrors(errors = {}) {
    return Object.fromEntries(
        Object.entries(errors).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
    );
}

export function sanitizeSearch(value) {
    return text(value).slice(0, 120);
}

export function couponCode(value) {
    const next = text(value).toUpperCase();

    if (!next) {
        return 'Enter a coupon code.';
    }

    if (!/^[A-Z0-9_-]{3,32}$/.test(next)) {
        return 'Use 3–32 letters or numbers.';
    }

    return null;
}
