import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth.jsx';
import { useConfirm } from '../../feedback.jsx';
import { Icon } from '../icons.jsx';
import { useNotifications } from '../../store/notifications.jsx';
import NotificationItem from './NotificationItem.jsx';

export default function NotificationBell() {
    const { user } = useAuth();
    const confirm = useConfirm();
    const { items, unreadCount, refreshRecent, markRead, markAllRead, clearRead } = useNotifications();
    const hasRead = items.some((item) => item.is_read);
    const [open, setOpen] = useState(false);
    const [pulse, setPulse] = useState(false);
    const previous = useRef(unreadCount);
    const root = useRef(null);

    useEffect(() => {
        if (unreadCount > previous.current) {
            setPulse(true);
            const timer = window.setTimeout(() => setPulse(false), 400);
            previous.current = unreadCount;
            return () => window.clearTimeout(timer);
        }

        previous.current = unreadCount;
        return undefined;
    }, [unreadCount]);

    useEffect(() => {
        if (open) {
            refreshRecent();
        }
    }, [open, refreshRecent]);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        function onPointer(event) {
            if (!root.current?.contains(event.target)) {
                setOpen(false);
            }
        }

        function onKey(event) {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        }

        document.addEventListener('pointerdown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    if (!user) {
        return null;
    }

    return (
        <div className="relative" ref={root}>
            <button
                type="button"
                aria-label={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'}
                aria-expanded={open}
                title="Notifications"
                className={`relative grid h-10 w-10 place-items-center rounded-full hover:bg-canvas ${open ? 'bg-canvas text-accent' : 'text-ink'}`}
                onClick={() => setOpen((value) => !value)}
            >
                <Icon name="bell" variant={open || unreadCount > 0 ? 'solid' : 'outline'} className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className={`absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-medium leading-4 text-white ${pulse ? 'badge-pop' : ''}`}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>
            {open && (
                <div className="dropdown-enter absolute right-0 z-[60] mt-2 w-[22rem] overflow-hidden rounded-xl border border-line bg-paper shadow-soft">
                    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 text-sm">
                        <p className="font-medium">Notifications</p>
                        <div className="flex shrink-0 items-center gap-3 text-xs">
                            {unreadCount > 0 && (
                                <button type="button" className="text-muted hover:text-ink" onClick={() => markAllRead()}>
                                    Mark all as read
                                </button>
                            )}
                            {hasRead && (
                                <button
                                    type="button"
                                    className="text-muted hover:text-ink"
                                    onClick={async () => {
                                        const ok = await confirm({
                                            title: 'Clear read notifications?',
                                            message: 'Read notifications will be removed from your inbox.',
                                            confirmLabel: 'Clear read',
                                        });
                                        if (!ok) {
                                            return;
                                        }
                                        await clearRead();
                                    }}
                                >
                                    Clear read
                                </button>
                            )}
                        </div>
                    </div>
                    <ul className="max-h-80 overflow-auto">
                        {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">You are all caught up.</li>}
                        {items.map((item) => (
                            <li key={item.id} className="border-b border-line last:border-b-0">
                                <NotificationItem
                                    item={item}
                                    compact
                                    onRead={(target) => {
                                        markRead(target.id);
                                        setOpen(false);
                                    }}
                                />
                            </li>
                        ))}
                    </ul>
                    <Link
                        to="/notifications"
                        className="block border-t border-line px-4 py-3 text-center text-sm font-medium hover:bg-canvas"
                        onClick={() => setOpen(false)}
                    >
                        View all notifications
                    </Link>
                </div>
            )}
        </div>
    );
}
