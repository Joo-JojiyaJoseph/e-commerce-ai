import { PageHeader } from '../components/common.jsx';
import FilterBar from './kit/FilterBar.jsx';
import ListBody, { EmptyFiltered } from './kit/ListBody.jsx';
import Pagination from './kit/Pagination.jsx';
import { useAdminList } from './kit/useAdminList.js';

const FIELDS = [
    { key: 'type', label: 'Category', type: 'select', options: [['order.', 'Order'], ['shipping.', 'Shipping'], ['payment.', 'Payment'], ['refund.', 'Refund'], ['review.', 'Review'], ['offer.', 'Offer'], ['coupon.', 'Coupon']].map(([value, label]) => ({ value, label })) },
    { key: 'date_from', label: 'From date', type: 'date' },
    { key: 'date_to', label: 'To date', type: 'date' },
];

const EXPORT_COLUMNS = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Title' },
    { key: 'user', label: 'Recipient', value: (row) => row.user?.email },
    { key: 'type', label: 'Type' },
    { key: 'is_read', label: 'Read', value: (row) => (row.is_read ? 'Yes' : 'No') },
    { key: 'created_at', label: 'Sent', value: (row) => (row.created_at ? new Date(row.created_at).toLocaleString() : '') },
];

export default function AdminNotifications() {
    const list = useAdminList('/api/admin/notifications', { perPage: 30 });

    return (
        <div className="space-y-5">
            <PageHeader eyebrow="Activity" title="Notification history" subtitle="What the store has sent to customers." />
            <FilterBar list={list} search="Search title or recipient" fields={FIELDS} exportConfig={{ endpoint: '/api/admin/notifications', filename: 'notifications', columns: EXPORT_COLUMNS }} />
            <ListBody list={list} empty={<EmptyFiltered list={list} title="No notifications yet" body="Order and review alerts will appear here." icon="bell" />}>
                <table className="ui-table">
                    <thead><tr><th>Title</th><th>Recipient</th><th>Type</th><th>Read</th></tr></thead>
                    <tbody>
                        {list.rows.map((item) => (
                            <tr key={item.id} className={!item.is_read ? 'bg-accent/[0.04]' : undefined}>
                                <td>
                                    <span className="inline-flex items-center gap-2">
                                        {!item.is_read && <span className="h-2 w-2 rounded-full bg-accent" />}
                                        <span className={item.is_read ? 'font-normal' : 'font-semibold'}>{item.title}</span>
                                    </span>
                                </td>
                                <td>{item.user?.email}</td>
                                <td className="text-muted">{item.type}</td>
                                <td>
                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.is_read ? 'bg-slate-900/[0.06] text-muted' : 'bg-accent/10 text-accent-dark'}`}>
                                        {item.is_read ? 'Read' : 'Unread'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ListBody>
            <Pagination list={list} />
        </div>
    );
}
