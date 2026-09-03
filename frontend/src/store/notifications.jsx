import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
    clearReadNotifications,
    deleteNotification,
    getNotificationUnreadCount,
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from '../api.js';
import { useAuth } from '../auth.jsx';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const refreshCount = useCallback(async () => {
        if (!user) {
            setUnreadCount(0);
            return 0;
        }

        const { data } = await getNotificationUnreadCount();
        setUnreadCount(data.count);
        return data.count;
    }, [user]);

    const refreshRecent = useCallback(async () => {
        if (!user) {
            setItems([]);
            return [];
        }

        setLoading(true);
        setError(null);

        try {
            const response = await getNotifications({ per_page: 8 });
            const next = response.data ?? [];
            setItems(next);
            await refreshCount();
            return next;
        } catch (caught) {
            setError(caught.message);
            return [];
        } finally {
            setLoading(false);
        }
    }, [user, refreshCount]);

    useEffect(() => {
        if (!user) {
            setItems([]);
            setUnreadCount(0);
            return undefined;
        }

        refreshRecent();

        const onFocus = () => {
            refreshCount().catch(() => {});
        };

        window.addEventListener('focus', onFocus);
        const timer = window.setInterval(() => {
            refreshCount().catch(() => {});
        }, 45000);

        return () => {
            window.removeEventListener('focus', onFocus);
            window.clearInterval(timer);
        };
    }, [user, refreshRecent, refreshCount]);

    const markRead = useCallback(async (id) => {
        await markNotificationRead(id);
        setItems((current) => current.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
        setUnreadCount((count) => Math.max(0, count - 1));
    }, []);

    const markAllRead = useCallback(async () => {
        await markAllNotificationsRead();
        setItems((current) => current.map((item) => ({ ...item, is_read: true })));
        setUnreadCount(0);
    }, []);

    const clearRead = useCallback(async () => {
        const result = await clearReadNotifications();
        setItems((current) => current.filter((item) => !item.is_read));
        return result;
    }, []);

    const remove = useCallback(async (id) => {
        const target = items.find((item) => item.id === id);
        await deleteNotification(id);
        setItems((current) => current.filter((item) => item.id !== id));
        if (target && !target.is_read) {
            setUnreadCount((count) => Math.max(0, count - 1));
        }
    }, [items]);

    const value = useMemo(() => ({
        items,
        unreadCount,
        loading,
        error,
        refreshRecent,
        refreshCount,
        markRead,
        markAllRead,
        clearRead,
        remove,
    }), [items, unreadCount, loading, error, refreshRecent, refreshCount, markRead, markAllRead, clearRead, remove]);

    return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
    const context = useContext(NotificationContext);

    if (!context) {
        throw new Error('useNotifications must be used inside NotificationProvider.');
    }

    return context;
}
