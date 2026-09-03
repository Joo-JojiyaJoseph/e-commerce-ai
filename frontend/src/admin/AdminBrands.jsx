import { useEffect, useState } from 'react';
import { adminGet, adminSend } from '../api.js';
import { Button, EmptyState, Input, PageHeader, TableShell, Toggle } from '../components/common.jsx';
import { useConfirm } from '../feedback.jsx';
import { useToast } from '../toast.jsx';

export default function AdminBrands() {
    const confirm = useConfirm();
    const { success, error } = useToast();
    const [items, setItems] = useState([]);
    const [busyId, setBusyId] = useState(null);
    const [form, setForm] = useState({ name: '', slug: '', logo_url: '', is_active: true });
    const [saving, setSaving] = useState(false);

    function load() {
        return adminGet('/api/admin/brands').then((response) => setItems(response.data ?? []));
    }

    useEffect(() => {
        load();
    }, []);

    async function toggleActive(item) {
        const next = !item.is_active;
        setBusyId(item.id);
        setItems((current) => current.map((row) => (row.id === item.id ? { ...row, is_active: next } : row)));
        try {
            await adminSend(`/api/admin/brands/${item.id}`, { ...item, is_active: next }, 'PATCH');
            success(next ? 'Brand activated' : 'Brand deactivated');
        } catch (caught) {
            error('Could not update brand', caught.message);
            load();
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader eyebrow="Catalogue" title="Brands" subtitle="Makers shown on the storefront and product pages." />
            <form
                className="grid gap-3 rounded-2xl border border-line bg-paper p-5 shadow-soft md:grid-cols-4"
                onSubmit={async (event) => {
                    event.preventDefault();
                    setSaving(true);
                    try {
                        await adminSend('/api/admin/brands', form);
                        setForm({ name: '', slug: '', logo_url: '', is_active: true });
                        success('Brand saved');
                        load();
                    } catch (caught) {
                        error('Could not save brand', caught.message);
                    } finally {
                        setSaving(false);
                    }
                }}
            >
                <Input label="Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                <Input label="Slug" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} />
                <Input label="Logo URL" value={form.logo_url} onChange={(event) => setForm((current) => ({ ...current, logo_url: event.target.value }))} />
                <div className="flex items-end justify-between gap-3">
                    <Toggle checked={form.is_active} onChange={(value) => setForm((current) => ({ ...current, is_active: value }))} />
                    <Button type="submit" loading={saving} loadingLabel="Saving…">Add</Button>
                </div>
            </form>
            <TableShell empty={items.length === 0} emptyState={<EmptyState title="No brands" body="Add a brand to group products." icon="building-storefront" />}>
                <table className="ui-table">
                    <thead><tr><th>Name</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.id}>
                                <td className="font-medium">{item.name}</td>
                                <td>
                                    <Toggle checked={item.is_active} disabled={busyId === item.id} onChange={() => toggleActive(item)} />
                                </td>
                                <td className="text-right">
                                    <button
                                        type="button"
                                        className="cursor-pointer text-sm text-danger hover:underline"
                                        onClick={async () => {
                                            const ok = await confirm({ title: 'Delete brand?', message: 'Products keep their data, but this brand will be removed.', confirmLabel: 'Delete' });
                                            if (!ok) return;
                                            await adminSend(`/api/admin/brands/${item.id}`, undefined, 'DELETE');
                                            load();
                                            success('Brand deleted');
                                        }}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableShell>
        </div>
    );
}
