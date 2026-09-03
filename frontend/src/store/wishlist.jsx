import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { addWishlist, getWishlist, removeWishlist } from '../api.js';
import { useAuth } from '../auth.jsx';
import { productKey } from '../format.js';

const WishlistContext = createContext(null);

function asIdSet(products) {
    return new Set(products.map((product) => productKey(product)).filter((id) => Number.isFinite(id) && id > 0));
}

export function WishlistProvider({ children }) {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [pending, setPending] = useState(() => new Set());

    const refresh = useCallback(async () => {
        if (!user) {
            setProducts([]);
            return [];
        }

        const { data } = await getWishlist();
        const next = Array.isArray(data) ? data : [];
        setProducts(next);
        return next;
    }, [user]);

    useEffect(() => {
        refresh().catch(() => setProducts([]));
    }, [refresh]);

    const ids = useMemo(() => asIdSet(products), [products]);

    const has = useCallback((product) => ids.has(productKey(product)), [ids]);

    const markPending = useCallback((id, value) => {
        setPending((current) => {
            const next = new Set(current);
            if (value) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    }, []);

    const value = useMemo(() => ({
        products,
        ids,
        has,
        pending,
        isPending: (product) => pending.has(productKey(product)),
        refresh,
        toggle: async (product) => {
            const id = productKey(product);

            if (!user || !Number.isFinite(id) || pending.has(id)) {
                return has(product);
            }

            const saved = ids.has(id);
            markPending(id, true);

            setProducts((current) => {
                if (saved) {
                    return current.filter((item) => productKey(item) !== id);
                }

                if (current.some((item) => productKey(item) === id)) {
                    return current;
                }

                return [{ ...product, id }, ...current];
            });

            try {
                if (saved) {
                    await removeWishlist(id);
                } else {
                    await addWishlist(id);
                }

                await refresh();
                return !saved;
            } catch (error) {
                await refresh().catch(() => {});
                throw error;
            } finally {
                markPending(id, false);
            }
        },
        remove: async (productId) => {
            const id = productKey(productId);
            const snapshot = products;
            setProducts((current) => current.filter((item) => productKey(item) !== id));

            try {
                await removeWishlist(id);
            } catch (error) {
                setProducts(snapshot);
                throw error;
            }
        },
    }), [products, ids, has, pending, refresh, user, markPending]);

    return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
    const context = useContext(WishlistContext);

    if (!context) {
        throw new Error('useWishlist must be used inside WishlistProvider.');
    }

    return context;
}
