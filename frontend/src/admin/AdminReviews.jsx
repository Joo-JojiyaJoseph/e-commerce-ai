import { adminSend } from '../api.js';
import { Button, PageHeader } from '../components/common.jsx';
import { Icon } from '../components/icons.jsx';
import { useToast } from '../toast.jsx';
import FilterBar from './kit/FilterBar.jsx';
import ListBody, { EmptyFiltered } from './kit/ListBody.jsx';
import Pagination from './kit/Pagination.jsx';
import { useAdminList } from './kit/useAdminList.js';

const TABS = ['pending', 'approved', 'rejected'];

const FIELDS = [
    { key: 'rating', label: 'Rating', type: 'select', options: [5, 4, 3, 2, 1].map((value) => ({ value, label: `${value} star${value === 1 ? '' : 's'}` })) },
    { key: 'date_from', label: 'From date', type: 'date' },
    { key: 'date_to', label: 'To date', type: 'date' },
];

const EXPORT_COLUMNS = [
    { key: 'id', label: 'ID' },
    { key: 'product', label: 'Product', value: (row) => row.product?.name },
    { key: 'user', label: 'Customer', value: (row) => row.user?.email },
    { key: 'rating', label: 'Rating', numeric: true },
    { key: 'title', label: 'Title' },
    { key: 'body', label: 'Review' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Submitted', value: (row) => (row.created_at ? new Date(row.created_at).toLocaleDateString() : '') },
];

function Stars({ value }) {
    return (
        <span className="inline-flex" aria-label={`${value} out of 5`}>
            {[1, 2, 3, 4, 5].map((n) => <Icon key={n} name="star" variant={n <= value ? 'solid' : 'outline'} className={`h-4 w-4 ${n <= value ? 'text-amber-400' : 'text-slate-300'}`} />)}
        </span>
    );
}

export default function AdminReviews() {
    const { success, error } = useToast();
    const list = useAdminList('/api/admin/reviews', { defaults: { status: 'pending' } });
    const status = list.values.status ?? 'pending';

    async function act(review, action) {
        try {
            await adminSend(`/api/admin/reviews/${review.id}/${action}`);
            success(action === 'approve' ? 'Review approved' : 'Review rejected');
            list.reload();
        } catch (caught) {
            error(`Could not ${action}`, caught.message);
        }
    }

    return (
        <div className="space-y-5">
            <PageHeader eyebrow="Catalogue" title="Reviews" subtitle="Approve customer reviews before they appear on the product." />
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Review status">
                {TABS.map((value) => (
                    <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={status === value}
                        className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition ${status === value ? 'border-accent bg-accent text-white shadow-[0_6px_16px_-4px_rgb(109_74_255_/_0.6)]' : 'border-white/70 bg-white/60 hover:bg-white'}`}
                        onClick={() => list.setFilters({ status: value })}
                    >
                        {value}
                    </button>
                ))}
            </div>
            <FilterBar list={list} search="Search reviews" fields={FIELDS} exportConfig={{ endpoint: '/api/admin/reviews', filename: `reviews-${status}`, columns: EXPORT_COLUMNS }} />
            <ListBody
                list={list}
                empty={<EmptyFiltered list={{ ...list, isFiltered: ['q', 'rating', 'date_from', 'date_to'].some((key) => list.values[key]) }} title={`No ${status} reviews`} body="New submissions will show up in Pending." icon="chat-bubble" />}
            >
                <ul className="divide-y divide-slate-900/[0.06]">
                    {list.rows.map((review) => (
                        <li key={review.id} className="p-5 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-semibold">{review.title || 'Untitled review'} <span className="font-normal text-muted">· {review.product?.name}</span></p>
                                <Stars value={Number(review.rating)} />
                            </div>
                            <p className="text-xs text-muted">{review.user?.email}</p>
                            {review.body && <p className="mt-2 leading-6">{review.body}</p>}
                            {status === 'pending' && (
                                <div className="mt-4 flex gap-2">
                                    <Button type="button" onClick={() => act(review, 'approve')}>Approve</Button>
                                    <Button type="button" variant="danger" onClick={() => act(review, 'reject')}>Reject</Button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </ListBody>
            <Pagination list={list} />
        </div>
    );
}
