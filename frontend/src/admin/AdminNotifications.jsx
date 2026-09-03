import { useEffect, useState } from 'react';
import { adminGet } from '../api.js';
import { EmptyState, PageHeader, TableShell } from '../components/common.jsx';

export default function AdminNotifications() {
    const [payload, setPayload] = useState(null);

    useEffect(() => {
        adminGet('/api/admin/notifications').then(setPayload);
    }, []);

    const rows = payload?.data ?? [];

    return (
        <div className="space-y-5">
            <PageHeader eyebrow="Activity" title="Notification history" subtitle="What the store has sent to customers." />
            <TableShell empty={Boolean(payload) && rows.length === 0} emptyState={<EmptyState title="No notifications yet" body="Order and review alerts will appear here." icon="bell" />}>
                <table className="ui-table">
                    <thead><tr><th>Title</th><th>Recipient</th><th>Type</th><th>Read</th></tr></thead>
                    <tbody>
                        {rows.map((item) => (
                            <tr key={item.id} className={!item.is_read ? 'bg-accent/[0.04]' : undefined}>
                                <td>
                                    <span className="inline-flex items-center gap-2">
                                        {!item.is_read && <span className="h-2 w-2 rounded-full bg-accent" />}
                                        <span className={item.is_read ? 'font-normal' : 'font-semibold'}>{item.title}</span>
                                    </span>
                                </td>
                                <td>{item.user?.email}</td>
                                <td>{item.type}</td>
                                <td>
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${item.is_read ? 'bg-canvas text-muted' : 'bg-accent/10 text-accent'}`}>
                                        {item.is_read ? 'Read' : 'Unread'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableShell>
        </div>
    );
}
