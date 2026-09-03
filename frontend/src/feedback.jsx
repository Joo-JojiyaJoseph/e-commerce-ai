import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Button, Modal } from './components/common.jsx';
import { Icon } from './components/icons.jsx';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
    const [dialog, setDialog] = useState(null);

    const confirm = useCallback((options) => {
        return new Promise((resolve) => {
            setDialog({
                title: 'Are you sure?',
                message: 'This action cannot be undone.',
                confirmLabel: 'Confirm',
                cancelLabel: 'Cancel',
                tone: 'danger',
                ...options,
                resolve,
            });
        });
    }, []);

    function close(result) {
        dialog?.resolve(result);
        setDialog(null);
    }

    const value = useMemo(() => ({ confirm }), [confirm]);
    const tone = dialog?.tone === 'danger' ? 'danger' : 'primary';

    return (
        <ConfirmContext.Provider value={value}>
            {children}
            <Modal open={Boolean(dialog)} title={dialog?.title} onClose={() => close(false)} size="sm">
                {dialog && (
                    <div className="space-y-5">
                        <p className="text-sm leading-6 text-muted">{dialog.message}</p>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => close(false)}>
                                {dialog.cancelLabel}
                            </Button>
                            <Button type="button" variant={tone} onClick={() => close(true)}>
                                {dialog.confirmLabel}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);

    if (!context) {
        throw new Error('useConfirm must be used inside ConfirmProvider.');
    }

    return context.confirm;
}

export function FeedbackBanner({ tone = 'info', title, children }) {
    const icons = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'exclamation-triangle',
        info: 'information-circle',
    };
    const tones = {
        success: 'border-success/20 bg-success/5 text-success',
        error: 'border-danger/20 bg-danger/5 text-danger',
        warning: 'border-warning/25 bg-warning/5 text-warning',
        info: 'border-info/20 bg-info/5 text-info',
    };

    return (
        <div className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
            <Icon name={icons[tone]} className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
                {title && <p className="font-medium text-ink">{title}</p>}
                <div className="text-muted">{children}</div>
            </div>
        </div>
    );
}
