const CART_TOKEN_KEY = 'commerce.cart_token';
const AUTH_TOKEN_KEY = 'commerce.auth_token';
const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';
const CURRENCY = import.meta.env.VITE_CURRENCY ?? 'INR';

export class ApiError extends Error {
    constructor(status, message, errors = {}) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
}

const FRIENDLY_STATUS = {
    400: 'That request could not be completed. Please try again.',
    401: 'Please sign in to continue.',
    403: 'You do not have permission to do that.',
    404: 'We could not find what you were looking for.',
    409: 'This action conflicts with the current state. Please refresh and try again.',
    422: 'Please check the highlighted fields and try again.',
    429: 'Too many attempts. Please wait a moment and try again.',
    500: 'Something went wrong. Please try again.',
    503: 'The store is temporarily unavailable. Please try again shortly.',
};

function looksTechnical(message) {
    return /SQLSTATE|Illuminate\\|Exception|Stack trace|SQL:|Whoops/i.test(message);
}

export function friendlyError(error, fallback = 'Something went wrong. Please try again.') {
    if (!error) {
        return fallback;
    }

    if (error.name === 'AbortError') {
        return fallback;
    }

    if (error instanceof ApiError) {
        if (error.status === 0) {
            return error.message;
        }

        if (error.message && !looksTechnical(error.message)) {
            return error.message;
        }

        return FRIENDLY_STATUS[error.status] ?? fallback;
    }

    return error.message && !looksTechnical(error.message) ? error.message : fallback;
}

function messageFromPayload(status, json) {
    const raw = typeof json.message === 'string' ? json.message : '';

    if (raw && !looksTechnical(raw)) {
        return raw;
    }

    return FRIENDLY_STATUS[status] ?? 'Something went wrong. Please try again.';
}

export function cartToken() {
    return localStorage.getItem(CART_TOKEN_KEY);
}

export function authToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token) {
    if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        return;
    }

    localStorage.removeItem(AUTH_TOKEN_KEY);
}

function rememberCart(payload) {
    if (payload && typeof payload === 'object' && typeof payload.uuid === 'string') {
        localStorage.setItem(CART_TOKEN_KEY, payload.uuid);
    }
}

async function request(path, options = {}) {
    const { signal, headers: extraHeaders, ...rest } = options;
    const headers = new Headers(extraHeaders);
    headers.set('Accept', 'application/json');

    if (rest.body) {
        headers.set('Content-Type', 'application/json');
    }

    const token = cartToken();
    const bearer = authToken();

    if (token) {
        headers.set('X-Cart-Token', token);
    }

    if (bearer) {
        headers.set('Authorization', `Bearer ${bearer}`);
    }

    let response;

    try {
        response = await fetch(`${API_URL}${path}`, {
            ...rest,
            signal,
            headers,
        });
    } catch (error) {
        if (error.name === 'AbortError') {
            throw error;
        }

        throw new ApiError(0, "We couldn't connect to the server. Please check your internet connection and try again.");
    }

    const json = await response.json().catch(() => ({}));

    if (json.data) {
        rememberCart(json.data);
    }

    if (!response.ok) {
        if (response.status === 401 && bearer && !path.startsWith('/api/auth/')) {
            window.dispatchEvent(new CustomEvent('commerce:unauthorized'));
        }

        throw new ApiError(response.status, messageFromPayload(response.status, json), json.errors ?? {});
    }

    return json;
}

export function getHome() {
    return request('/api/commerce/home');
}

export function listProducts(filters = {}, signal) {
    const search = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            search.set(key, String(value));
        }
    });

    const query = search.toString();

    return request(`/api/commerce/shop${query ? `?${query}` : ''}`, { signal });
}

export function getProduct(slug) {
    return request(`/api/commerce/catalog/${slug}`);
}

export function getCategories() {
    return request('/api/commerce/categories');
}

export function getBrands() {
    return request('/api/commerce/brands');
}

export function suggestProducts(query = '', signal) {
    const search = query !== '' ? `?q=${encodeURIComponent(query)}` : '';

    return request(`/api/commerce/suggest${search}`, { signal });
}

export function sendContact(payload) {
    return request('/api/contact', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function getCart() {
    return request('/api/commerce/cart');
}

export function addCartItem(variantId, quantity) {
    return request('/api/commerce/cart/items', {
        method: 'POST',
        body: JSON.stringify({ variant_id: variantId, quantity }),
    });
}

export function updateCartItem(itemId, quantity) {
    return request(`/api/commerce/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
    });
}

export function removeCartItem(itemId) {
    return request(`/api/commerce/cart/items/${itemId}`, {
        method: 'DELETE',
    });
}

export function applyDiscount(code) {
    return request('/api/commerce/cart/discount', {
        method: 'POST',
        body: JSON.stringify({ code }),
    });
}

export function clearDiscount() {
    return request('/api/commerce/cart/discount', {
        method: 'DELETE',
    });
}

export function checkout(payload) {
    return request('/api/commerce/checkout', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function getOrder(number) {
    return request(`/api/commerce/orders/${number}`);
}

export function getPaymentMethods() {
    return request('/api/commerce/payments/methods');
}

export function confirmPayment(payload) {
    return request('/api/commerce/payments/confirm', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function register(payload) {
    return request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function login(payload) {
    return request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function logout() {
    return request('/api/auth/logout', { method: 'POST' });
}

export function me() {
    return request('/api/auth/me');
}

export function updateProfile(payload) {
    return request('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
}

export function changePassword(payload) {
    return request('/api/auth/password', {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
}

export function forgotPassword(email) {
    return request('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
}

export function resetPassword(payload) {
    return request('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function getWishlist() {
    return request('/api/commerce/wishlist');
}

export function addWishlist(productId) {
    return request('/api/commerce/wishlist', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId }),
    });
}

export function removeWishlist(productId) {
    return request(`/api/commerce/wishlist/${productId}`, {
        method: 'DELETE',
    });
}

export function getAddresses() {
    return request('/api/commerce/addresses');
}

export function createAddress(payload) {
    return request('/api/commerce/addresses', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function updateAddress(id, payload) {
    return request(`/api/commerce/addresses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
}

export function deleteAddress(id) {
    return request(`/api/commerce/addresses/${id}`, {
        method: 'DELETE',
    });
}

export function getReviews(slug) {
    return request(`/api/commerce/products/${slug}/reviews`);
}

export function getStorefrontConfig() {
    return request('/api/commerce/storefront-config');
}

export function askAssistant(message, { signal } = {}) {
    return request('/api/commerce/assistant', {
        method: 'POST',
        body: JSON.stringify({ message }),
        signal,
    });
}

export function createReview(slug, payload) {
    return request(`/api/commerce/products/${slug}/reviews`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function getAccountOrders() {
    return request('/api/commerce/account/orders');
}

export function getAccountOrder(number) {
    return request(`/api/commerce/account/orders/${number}`);
}

export function cancelAccountOrder(number) {
    return request(`/api/commerce/account/orders/${number}/cancel`, {
        method: 'POST',
    });
}

export function getRecentlyViewed() {
    return request('/api/commerce/recently-viewed');
}

export function getNotifications(params = {}, signal) {
    const search = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            search.set(key, String(value));
        }
    });

    const query = search.toString();

    return request(`/api/notifications${query ? `?${query}` : ''}`, { signal });
}

export function getNotificationUnreadCount() {
    return request('/api/notifications/unread-count');
}

export function markNotificationRead(id) {
    return request(`/api/notifications/${id}/read`, { method: 'POST' });
}

export function markAllNotificationsRead() {
    return request('/api/notifications/read-all', { method: 'POST' });
}

export function clearReadNotifications() {
    return request('/api/notifications/clear-read', { method: 'POST' });
}

export function deleteNotification(id) {
    return request(`/api/notifications/${id}`, { method: 'DELETE' });
}

export function getNotificationPreferences() {
    return request('/api/notifications/preferences');
}

export function updateNotificationPreferences(payload) {
    return request('/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
}

export async function upload(path, formData, method = 'POST') {
    const headers = new Headers();
    headers.set('Accept', 'application/json');

    const token = cartToken();
    const bearer = authToken();

    if (token) {
        headers.set('X-Cart-Token', token);
    }

    if (bearer) {
        headers.set('Authorization', `Bearer ${bearer}`);
    }

    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: formData,
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new ApiError(response.status, json.message ?? 'The request failed.', json.errors ?? {});
    }

    return json;
}

export function adminGet(path) {
    return request(path);
}

export function adminSend(path, payload, method = 'POST') {
    return request(path, {
        method,
        ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
}

export function money(amount, currency = CURRENCY) {
    const value = Number(amount);

    if (Number.isNaN(value)) {
        return '';
    }

    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(value);
}

const SEARCH_HISTORY_KEY = 'commerce.search_history';

export function readSearchHistory() {
    try {
        const value = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) ?? '[]');

        return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
    } catch {
        return [];
    }
}

export function rememberSearch(term) {
    const value = term.trim();

    if (value.length < 2) {
        return readSearchHistory();
    }

    const next = [value, ...readSearchHistory().filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 8);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));

    return next;
}

export function clearSearchHistory() {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
}
