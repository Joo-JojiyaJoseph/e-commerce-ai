import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { addCartItem, applyDiscount, clearDiscount, getCart, removeCartItem, updateCartItem } from '../api.js';

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const [cart, setCart] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    async function refresh() {
        const { data } = await getCart();
        setCart(data);
        return data;
    }

    useEffect(() => {
        refresh().catch(() => setCart({ items: [] }));
    }, []);

    const count = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

    const value = useMemo(() => ({
        cart,
        count,
        drawerOpen,
        openDrawer: () => setDrawerOpen(true),
        closeDrawer: () => setDrawerOpen(false),
        refresh,
        addItem: async (variantId, quantity = 1, options = {}) => {
            const { data } = await addCartItem(variantId, quantity);
            setCart(data);
            if (options.openDrawer !== false) {
                setDrawerOpen(true);
            }
            return data;
        },
        updateItem: async (itemId, quantity) => {
            const { data } = await updateCartItem(itemId, quantity);
            setCart(data);
            return data;
        },
        removeItem: async (itemId) => {
            const { data } = await removeCartItem(itemId);
            setCart(data);
            return data;
        },
        applyCode: async (code) => {
            const { data } = await applyDiscount(code);
            setCart(data);
            return data;
        },
        removeCode: async () => {
            const { data } = await clearDiscount();
            setCart(data);
            return data;
        },
    }), [cart, count, drawerOpen]);

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const context = useContext(CartContext);

    if (!context) {
        throw new Error('useCart must be used inside CartProvider.');
    }

    return context;
}
