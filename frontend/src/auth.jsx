import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authToken, login as loginRequest, logout as logoutRequest, me, register as registerRequest, setAuthToken } from './api.js';
import { useToast } from './toast.jsx';

const AuthContext = createContext(null);
const USER_KEY = 'commerce.auth_user';

function readUser() {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(readUser);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!authToken()) {
            setReady(true);
            return;
        }

        me()
            .then(({ data }) => {
                setUser(data);
                localStorage.setItem(USER_KEY, JSON.stringify(data));
            })
            .catch(() => {
                setUser(null);
                setAuthToken(null);
                localStorage.removeItem(USER_KEY);
            })
            .finally(() => setReady(true));
    }, []);

    async function authenticate(payload, mode) {
        const { data } = mode === 'register' ? await registerRequest(payload) : await loginRequest(payload);
        setAuthToken(data.token);
        const next = { id: data.id, name: data.name, email: data.email, roles: data.roles ?? [] };
        setUser(next);
        localStorage.setItem(USER_KEY, JSON.stringify(next));
        return next;
    }

    async function signOut() {
        try {
            await logoutRequest();
        } catch {
            // Token may already be invalid.
        }

        setUser(null);
        setAuthToken(null);
        localStorage.removeItem(USER_KEY);
    }

    const value = useMemo(() => ({
        user,
        ready,
        login: (payload) => authenticate(payload, 'login'),
        register: (payload) => authenticate(payload, 'register'),
        signOut,
        setUser: (next) => {
            setUser(next);
            localStorage.setItem(USER_KEY, JSON.stringify(next));
        },
    }), [user, ready]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function SessionWatcher() {
    const { user, signOut } = useAuth();
    const { warning } = useToast();

    useEffect(() => {
        function onUnauthorized() {
            if (!user) {
                return;
            }

            signOut();
            warning('Session expired', 'Please sign in again to continue.');
        }

        window.addEventListener('commerce:unauthorized', onUnauthorized);
        return () => window.removeEventListener('commerce:unauthorized', onUnauthorized);
    }, [user, signOut, warning]);

    return null;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider.');
    }

    return context;
}
