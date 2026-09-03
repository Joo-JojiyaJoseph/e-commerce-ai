import { useEffect, useState } from 'react';
import { adminGet, adminSend } from '../api.js';
import { Button, EmptyState, PageHeader } from '../components/common.jsx';
import { useToast } from '../toast.jsx';

export default function AdminReviews() {
    const { success, error } = useToast();
    const [payload, setPayload] = useState(null);
    const [status, setStatus] = useState('pending');

    function load() {
        return adminGet(`/api/admin/reviews?status=${status}`).then(setPayload);
    }

    useEffect(() => {
        load();
    }, [status]);

    const rows = payload?.data ?? [];

    return (
        <div className="space-y-5">
            <PageHeader eyebrow="Catalogue" title="Reviews" subtitle="Approve customer reviews before they appear on the product." />
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Review status">
                {['pending', 'approved', 'rejected'].map((value) => (
                    <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={status === value}
                        className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm capitalize transition ${status === value ? 'border-ink bg-ink text-white' : 'border-line bg-paper hover:border-ink/40'}`}
                        onClick={() => setStatus(value)}
                    >
                        {value}
                    </button>
                ))}
            </div>
            {rows.length === 0 && payload && (
                <EmptyState title={`No ${status} reviews`} body="New submissions will show up in Pending." icon="chat-bubble" />
            )}
            <ul className="space-y-3">
                {rows.map((review) => (
                    <li key={review.id} className="rounded-2xl border border-line bg-paper p-5 text-sm shadow-soft">
                        <p className="font-medium">{review.title || `${review.rating}/5`} · {review.product?.name}</p>
                        <p className="text-muted">{review.user?.email}</p>
                        {review.body && <p className="mt-2 leading-6">{review.body}</p>}
                        {status === 'pending' && (
                            <div className="mt-4 flex gap-2">
                                <Button type="button" onClick={() => adminSend(`/api/admin/reviews/${review.id}/approve`).then(() => { success('Review approved'); load(); }).catch((caught) => error('Could not approve', caught.message))}>Approve</Button>
                                <Button type="button" variant="danger" onClick={() => adminSend(`/api/admin/reviews/${review.id}/reject`).then(() => { success('Review rejected'); load(); }).catch((caught) => error('Could not reject', caught.message))}>Reject</Button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
