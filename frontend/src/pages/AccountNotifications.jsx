import { useEffect, useState } from 'react';
import { getNotificationPreferences, updateNotificationPreferences } from '../api.js';
import { Button } from '../components/common.jsx';
import { useToast } from '../toast.jsx';
import { AccountShell } from './AccountShell.jsx';

export default function AccountNotifications() {
    const { push } = useToast();
    const [offers, setOffers] = useState(true);

    useEffect(() => {
        getNotificationPreferences()
            .then(({ data }) => setOffers(Boolean(data.offers)))
            .catch(() => {});
    }, []);

    return (
        <AccountShell title="Notification settings">
            <form
                className="max-w-lg space-y-4 rounded-2xl border border-line bg-paper p-6 shadow-soft"
                onSubmit={async (event) => {
                    event.preventDefault();
                    await updateNotificationPreferences({ offers });
                    push({ title: 'Preferences saved', message: 'Your notification settings have been updated.', tone: 'success' });
                }}
            >
                <p className="text-sm text-muted">
                    Order, payment, review, and security alerts stay on. You can opt out of marketing offers.
                </p>
                <label className="flex items-center justify-between gap-4 text-sm">
                    <span>Offers and coupons</span>
                    <input type="checkbox" checked={offers} onChange={(event) => setOffers(event.target.checked)} />
                </label>
                <Button type="submit">Save</Button>
            </form>
        </AccountShell>
    );
}
