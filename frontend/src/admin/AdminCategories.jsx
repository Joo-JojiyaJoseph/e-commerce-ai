import { useEffect, useState } from 'react';
import { adminGet, adminSend } from '../api.js';
import { Button, Input, PageHeader, Select, Toggle } from '../components/common.jsx';
import { useConfirm } from '../feedback.jsx';
import { useToast } from '../toast.jsx';

export default function AdminCategories() {
    const confirm = useConfirm();
    const { success, error } = useToast();
    const [items, setItems] = useState([]);
    const [busyId, setBusyId] = useState(null);
    const [form, setForm] = useState({ name: '', slug: '', is_active: true, parent_id: '' });
    const [saving, setSaving] = useState(false);

    function load() {
        return adminGet('/api/admin/categories').then((response) => setItems(response.data ?? []));
    }

    useEffect(() => {
        load();
    }, []);

    async function toggleActive(item) {
        const next = !item.is_active;
        setBusyId(item.id);
        setItems((current) => current.map((row) => (row.id === item.id ? { ...row, is_active: next } : row)));
        try {
            await adminSend(`/api/admin/categories/${item.id}`, { ...item, is_active: next }, 'PATCH');
            success(next ? 'Category activated' : 'Category deactivated');
        } catch (caught) {
            error('Could not update category', caught.message);
            load();
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader eyebrow="Catalogue" title="Categories" subtitle="Group products for the storefront filters." />
            <form
                className="grid gap-3 rounded-2xl border border-line bg-paper p-5 shadow-soft md:grid-cols-4"
                onSubmit={async (event) => {
                    event.preventDefault();
                    setSaving(true);
                    try {
                        await adminSend('/api/admin/categories', { ...form, parent_id: form.parent_id || null });
                        setForm({ name: '', slug: '', is_active: true, parent_id: '' });
                        success('Category saved');
                        load();
                    } catch (caught) {
                        error('Could not save category', caught.message);
                    } finally {
                        setSaving(false);
                    }
                }}
            >
                <Input label="Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                <Input label="Slug" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} />
                <Select label="Parent" value={form.parent_id} onChange={(event) => setForm((current) => ({ ...current, parent_id: event.target.value }))}>
                    <option value="">None</option>
                    {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </Select>
                <div className="flex items-end justify-between gap-3">
                    <Toggle checked={form.is_active} onChange={(value) => setForm((current) => ({ ...current, is_active: value }))} />
                    <Button type="submit" loading={saving} loadingLabel="Saving…">Add</Button>
                </div>
            </form>
            <div className="overflow-x-auto rounded-2xl border border-line bg-paper shadow-soft">
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
                                            const ok = await confirm({
                                                title: 'Delete category?',
                                                message: 'This action cannot be undone.',
                                                confirmLabel: 'Delete',
                                            });
                                            if (!ok) return;
                                            await adminSend(`/api/admin/categories/${item.id}`, undefined, 'DELETE');
                                            load();
                                            success('Category deleted');
                                        }}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
