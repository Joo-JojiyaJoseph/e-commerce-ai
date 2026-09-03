import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNotifications } from '../api.js';
import { Button, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/common.jsx';
import NotificationItem from '../components/notifications/NotificationItem.jsx';
import { useConfirm } from '../feedback.jsx';
import { useToast } from '../toast.jsx';
import { RequireAuth } from './AccountShell.jsx';
import { useNotifications } from '../store/notifications.jsx';

const FILTERS = [
    ['all', 'All'],
    ['unread', 'Unread'],
    ['order', 'Orders'],
    ['payment', 'Payments'],
    ['shipping', 'Delivery'],
    ['review', 'Reviews'],
    ['offer', 'Offers'],
];

export default function Notifications() {
    return (
        <RequireAuth>
            <NotificationPage />
        </RequireAuth>
    );
}

function NotificationPage() {
    const confirm = useConfirm();
    const { refreshCount, markRead, markAllRead, clearRead, remove } = useNotifications();
    const { success, error } = useToast();
    const [type, setType] = useState('all');
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(null);

    async function load(nextType = type, page = 1) {
        setLoading(true);
        setFailed(null);

        try {
            const unread = nextType === 'unread';
            const response = await getNotifications({
                type: unread || nextType === 'all' ? '' : nextType,
                unread: unread ? 1 : undefined,
                page,
            });
            setItems(response.data ?? []);
            setMeta(response.meta ?? null);
            await refreshCount();
        } catch (caught) {
            setFailed(caught.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load(type);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Notifications"
                subtitle="Order, payment, delivery, and review updates from your account."
                actions={(
                    <>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={async () => {
                                await markAllRead();
                                success('All caught up', 'Every notification is marked as read.');
                                load();
                            }}
                        >
                            Mark all as read
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={async () => {
                                const ok = await confirm({
                                    title: 'Clear read notifications?',
                                    message: 'Notifications you have already read will be removed. Unread alerts stay in your inbox.',
                                    confirmLabel: 'Clear read',
                                });
                                if (!ok) {
                                    return;
                                }
                                try {
                                    const result = await clearRead();
                                    const deleted = result?.data?.deleted ?? 0;
                                    success(
                                        deleted ? 'Read notifications cleared' : 'Nothing to clear',
                                        deleted ? `${deleted} ${deleted === 1 ? 'notification was' : 'notifications were'} removed.` : 'There were no read notifications.',
                                    );
                                    load();
                                } catch (caught) {
                                    error('Could not clear notifications', caught.message);
                                }
                            }}
                        >
                            Clear all read
                        </Button>
                    </>
                )}
            />
            <div className="flex gap-2 overflow-x-auto pb-1">
                {FILTERS.map(([value, label]) => (
                    <button
                        key={value}
                        type="button"
                        className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${type === value ? 'border-ink bg-ink text-white' : 'border-line bg-paper text-ink hover:border-ink'}`}
                        onClick={() => setType(value)}
                    >
                        {label}
                    </button>
                ))}
            </div>
            {loading && <Skeleton className="h-40" />}
            {failed && <ErrorState title="Unable to load notifications" body={failed} onRetry={() => load()} />}
            {!loading && !failed && items.length === 0 && (
                <EmptyState
                    title="No notifications"
                    body="You're all caught up. Order and review updates will appear here."
                    icon="bell"
                    action={<Button as={Link} to="/shop" variant="ghost">Continue shopping</Button>}
                />
            )}
            <ul className="space-y-2">
                {items.map((item) => (
                    <li key={item.id}>
                        <NotificationItem
                            item={item}
                            onRead={async (target) => {
                                await markRead(target.id);
                                setItems((current) => current.map((row) => (row.id === target.id ? { ...row, is_read: true } : row)));
                            }}
                            onDelete={async (target) => {
                                const ok = await confirm({
                                    title: 'Delete notification?',
                                    message: 'This notification will be removed from your inbox.',
                                    confirmLabel: 'Delete',
                                });
                                if (!ok) {
                                    return;
                                }
                                try {
                                    await remove(target.id);
                                    setItems((current) => current.filter((row) => row.id !== target.id));
                                    success('Notification removed');
                                } catch (caught) {
                                    error('Could not delete', caught.message);
                                }
                            }}
                        />
                    </li>
                ))}
            </ul>
            {meta?.last_page > 1 && (
                <div className="flex justify-center gap-2">
                    {Array.from({ length: meta.last_page }, (_, index) => index + 1).map((page) => (
                        <button
                            key={page}
                            type="button"
                            className={`h-9 w-9 rounded-md text-sm ${Number(meta.current_page) === page ? 'bg-ink text-white' : 'border border-line bg-paper'}`}
                            onClick={() => load(type, page)}
                        >
                            {page}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
