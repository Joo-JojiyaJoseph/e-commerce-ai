import { createContext, useContext, useMemo, useState } from 'react';
import { Icon } from './components/icons.jsx';

const ToastContext = createContext(null);

const TONES = {
    success: { icon: 'check-circle', bar: 'bg-success', label: 'Success' },
    error: { icon: 'x-circle', bar: 'bg-danger', label: 'Error' },
    warning: { icon: 'exclamation-triangle', bar: 'bg-warning', label: 'Warning' },
    info: { icon: 'information-circle', bar: 'bg-info', label: 'Info' },
    ok: { icon: 'check-circle', bar: 'bg-success', label: 'Success' },
};

function normalize(input, tone) {
    if (input && typeof input === 'object') {
        return {
            title: input.title,
            message: input.message ?? '',
            tone: input.tone ?? tone ?? 'success',
        };
    }

    return {
        title: undefined,
        message: String(input ?? ''),
        tone: tone === 'error' ? 'error' : (tone || 'success'),
    };
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    function dismiss(id) {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }

    function push(input, tone) {
        const id = crypto.randomUUID();
        const next = { id, ...normalize(input, tone) };
        setToasts((current) => [...current, next]);
        const duration = next.tone === 'error' ? 6000 : 3800;
        window.setTimeout(() => dismiss(id), duration);
        return id;
    }

    const value = useMemo(() => ({
        push,
        dismiss,
        success: (title, message) => push({ title, message, tone: 'success' }),
        error: (title, message) => push({ title, message, tone: 'error' }),
        warning: (title, message) => push({ title, message, tone: 'warning' }),
        info: (title, message) => push({ title, message, tone: 'info' }),
    }), []);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex flex-col items-center gap-2 px-4">
                {toasts.map((toast) => {
                    const meta = TONES[toast.tone] ?? TONES.success;

                    return (
                        <div
                            key={toast.id}
                            className="toast-enter pointer-events-auto flex w-full max-w-sm gap-3 rounded-xl border border-line bg-paper p-3 shadow-soft"
                            role="status"
                        >
                            <span className={`w-1 shrink-0 rounded-full ${meta.bar}`} />
                            <Icon name={meta.icon} className="mt-0.5 h-5 w-5 shrink-0 text-ink" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-ink">{toast.title || meta.label}</p>
                                {toast.message && <p className="mt-0.5 text-sm leading-5 text-muted">{toast.message}</p>}
                            </div>
                            <button
                                type="button"
                                className="self-start rounded-md p-1 text-muted hover:text-ink"
                                aria-label="Dismiss"
                                onClick={() => dismiss(toast.id)}
                            >
                                <Icon name="close" className="h-4 w-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error('useToast must be used inside ToastProvider.');
    }

    return context;
}
