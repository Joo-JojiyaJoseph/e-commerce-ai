import { useState } from 'react';
import { adminSend } from '../api.js';
import { Badge, Button, Input, PageHeader, Select, Toggle } from '../components/common.jsx';
import { useToast } from '../toast.jsx';
import FilterBar from './kit/FilterBar.jsx';
import ListBody, { EmptyFiltered } from './kit/ListBody.jsx';
import Pagination from './kit/Pagination.jsx';
import { useAdminList } from './kit/useAdminList.js';

const FIELDS = [
    { key: 'type', label: 'Type', type: 'select', options: [{ value: 'percentage', label: 'Percentage' }, { value: 'fixed', label: 'Fixed amount' }] },
    { key: 'active', label: 'Status', type: 'select', options: [{ value: '1', label: 'Active' }, { value: '0', label: 'Inactive' }] },
    { key: 'date_from', label: 'Created from', type: 'date' },
    { key: 'date_to', label: 'Created to', type: 'date' },
];

const EXPORT_COLUMNS = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'value', label: 'Value', numeric: true },
    { key: 'is_active', label: 'Active', value: (row) => (row.is_active ? 'Yes' : 'No') },
    { key: 'used_count', label: 'Times used', numeric: true },
];

export default function AdminCoupons() {
    const { success, error } = useToast();
    const list = useAdminList('/api/admin/coupons');
    const [busyId, setBusyId] = useState(null);
    const [form, setForm] = useState({ code: '', name: '', type: 'percentage', value: 10, is_active: true });
    const [saving, setSaving] = useState(false);

    async function toggleActive(coupon) {
        const next = !coupon.is_active;
        setBusyId(coupon.id);
        list.mutateRows((rows) => rows.map((row) => (row.id === coupon.id ? { ...row, is_active: next } : row)));
        try {
            await adminSend(`/api/admin/coupons/${coupon.id}`, { ...coupon, is_active: next }, 'PATCH');
            success(next ? 'Coupon activated' : 'Coupon deactivated');
        } catch (caught) {
            error('Could not update coupon', caught.message);
            list.reload();
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
                        list.reload();
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
            <FilterBar list={list} search="Search code or name" fields={FIELDS} exportConfig={{ endpoint: '/api/admin/coupons', filename: 'coupons', columns: EXPORT_COLUMNS }} />
            <ListBody list={list} empty={<EmptyFiltered list={list} title="No coupons" body="Add WELCOME10 or another code to start." icon="sparkles" />}>
                <table className="ui-table">
                    <thead><tr><th>Code</th><th>Value</th><th>Status</th></tr></thead>
                    <tbody>
                        {list.rows.map((coupon) => (
                            <tr key={coupon.id}>
                                <td>
                                    <p className="font-medium">{coupon.code}</p>
                                    <p className="text-xs text-muted">{coupon.name}</p>
                                </td>
                                <td><Badge tone="accent">{coupon.type === 'percentage' ? `${Number(coupon.value)}% off` : `${Number(coupon.value)} off`}</Badge></td>
                                <td>
                                    <Toggle checked={coupon.is_active} disabled={busyId === coupon.id} onChange={() => toggleActive(coupon)} />
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
