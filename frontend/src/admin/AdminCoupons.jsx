import { useEffect, useState } from 'react';
import { adminGet, adminSend } from '../api.js';
import { Button, EmptyState, Input, PageHeader, Select, TableShell, Toggle } from '../components/common.jsx';
import { useToast } from '../toast.jsx';

export default function AdminCoupons() {
    const { success, error } = useToast();
    const [payload, setPayload] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [form, setForm] = useState({ code: '', name: '', type: 'percentage', value: 10, is_active: true });
    const [saving, setSaving] = useState(false);

    function load() {
        return adminGet('/api/admin/coupons').then(setPayload);
    }

    useEffect(() => {
        load();
    }, []);

    const rows = payload?.data ?? [];

    async function toggleActive(coupon) {
        const next = !coupon.is_active;
        setBusyId(coupon.id);
        setPayload((current) => ({
            ...current,
            data: (current?.data ?? []).map((row) => (row.id === coupon.id ? { ...row, is_active: next } : row)),
        }));
        try {
            await adminSend(`/api/admin/coupons/${coupon.id}`, { ...coupon, is_active: next }, 'PATCH');
            success(next ? 'Coupon activated' : 'Coupon deactivated');
        } catch (caught) {
            error('Could not update coupon', caught.message);
            load();
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader eyebrow="Marketing" title="Coupons" subtitle="Codes customers can apply at checkout." />
            <form
                className="grid gap-3 rounded-2xl border border-line bg-paper p-5 shadow-soft md:grid-cols-5"
                onSubmit={async (event) => {
                    event.preventDefault();
                    setSaving(true);
                    try {
                        await adminSend('/api/admin/coupons', form);
                        setForm({ code: '', name: '', type: 'percentage', value: 10, is_active: true });
                        success('Coupon saved');
                        load();
                    } catch (caught) {
                        error('Could not save coupon', caught.message);
                    } finally {
                        setSaving(false);
                    }
                }}
            >
                <Input label="Code" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} required />
                <Input label="Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                <Select label="Type" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed</option>
                </Select>
                <Input label="Value" type="number" value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: Number(event.target.value) }))} />
                <div className="flex items-end justify-between gap-3">
                    <Toggle checked={form.is_active} onChange={(value) => setForm((current) => ({ ...current, is_active: value }))} />
                    <Button type="submit" loading={saving} loadingLabel="Saving…">Add</Button>
                </div>
            </form>
            <TableShell empty={Boolean(payload) && rows.length === 0} emptyState={<EmptyState title="No coupons" body="Add WELCOME10 or another code to start." icon="sparkles" />}>
                <table className="ui-table">
                    <thead><tr><th>Code</th><th>Value</th><th>Status</th></tr></thead>
                    <tbody>
                        {rows.map((coupon) => (
                            <tr key={coupon.id}>
                                <td>
                                    <p className="font-medium">{coupon.code}</p>
                                    <p className="text-xs text-muted">{coupon.name}</p>
                                </td>
                                <td>{coupon.value}{coupon.type === 'percentage' ? '%' : ''} ({coupon.type})</td>
                                <td>
                                    <Toggle checked={coupon.is_active} disabled={busyId === coupon.id} onChange={() => toggleActive(coupon)} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableShell>
        </div>
    );
}
