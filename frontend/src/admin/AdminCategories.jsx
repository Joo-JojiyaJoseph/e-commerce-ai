import { useMemo, useState } from 'react';
import { adminSend } from '../api.js';
import { Badge, Button, Input, Modal, PageHeader, Select, Toggle } from '../components/common.jsx';
import { Icon } from '../components/icons.jsx';
import { useConfirm } from '../feedback.jsx';
import { useToast } from '../toast.jsx';
import FilterBar from './kit/FilterBar.jsx';
import ListBody, { EmptyFiltered } from './kit/ListBody.jsx';
import { useCategoryOptions } from './kit/lookups.js';
import Pagination from './kit/Pagination.jsx';
import { useAdminList } from './kit/useAdminList.js';

const EMPTY = { name: '', slug: '', is_active: true, parent_id: '' };

const EXPORT_COLUMNS = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'slug', label: 'Slug' },
    { key: 'parent', label: 'Parent', value: (row) => row.parent?.name ?? '' },
    { key: 'is_active', label: 'Active', value: (row) => (row.is_active ? 'Yes' : 'No') },
    { key: 'children_count', label: 'Subcategories', numeric: true },
    { key: 'products_count', label: 'Products', numeric: true },
];

/** Parent choices for a category, excluding itself and everything beneath it (prevents loops). */
function parentChoices(options, editingId) {
    if (!editingId) return options;
    const blocked = new Set([editingId]);
    const byId = new Map(options.map((item) => [item.id, item]));
    options.forEach((item) => {
        let cursor = item;
        const guard = new Set();
        while (cursor && !guard.has(cursor.id)) {
            guard.add(cursor.id);
            if (blocked.has(cursor.parent_id)) {
                blocked.add(item.id);
                break;
            }
            cursor = byId.get(cursor.parent_id);
        }
    });
    return options.filter((item) => !blocked.has(item.id));
}

function CategoryForm({ value, onChange, options, editingId }) {
    const choices = useMemo(() => parentChoices(options, editingId), [options, editingId]);

    return (
        <div className="grid gap-3 md:grid-cols-2">
            <Input label="Name" value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} required />
            <Input label="Slug" hint="Leave blank to generate from the name" value={value.slug} onChange={(event) => onChange({ ...value, slug: event.target.value })} />
            <Select label="Parent category" value={value.parent_id} onChange={(event) => onChange({ ...value, parent_id: event.target.value })}>
                <option value="">None (top level)</option>
                {choices.map((item) => <option key={item.id} value={item.id}>{`${'— '.repeat(item.depth)}${item.name}`}</option>)}
            </Select>
            <div className="flex items-end gap-3 pb-1">
                <Toggle checked={value.is_active} onChange={(next) => onChange({ ...value, is_active: next })} />
                <span className="text-sm">{value.is_active ? 'Active on the storefront' : 'Hidden'}</span>
            </div>
        </div>
    );
}

export default function AdminCategories() {
    const confirm = useConfirm();
    const { success, error } = useToast();
    const list = useAdminList('/api/admin/categories', { perPage: 50 });
    const { options, loaded: optionsLoaded } = useCategoryOptions();
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [editing, setEditing] = useState(null);

    const topLevel = options.filter((item) => item.depth === 0).map((item) => ({ value: item.value, label: item.name }));
    const fields = [
        { key: 'parent_id', label: 'Parent', type: 'select', options: [{ value: 'root', label: 'Top level only' }, ...topLevel.map((item) => ({ value: item.value, label: `Under ${item.label}` }))] },
        { key: 'active', label: 'Visibility', type: 'select', options: [{ value: '1', label: 'Active' }, { value: '0', label: 'Hidden' }] },
        { key: 'date_from', label: 'Created from', type: 'date' },
        { key: 'date_to', label: 'Created to', type: 'date' },
    ];

    const body = (item) => ({ name: item.name, slug: item.slug || undefined, is_active: item.is_active, parent_id: item.parent_id ? Number(item.parent_id) : null });

    async function create(event) {
        event.preventDefault();
        setSaving(true);
        try {
            await adminSend('/api/admin/categories', body(form));
            setForm(EMPTY);
            success('Category added');
            list.reload();
            window.dispatchEvent(new Event('categories:changed'));
        } catch (caught) {
            error('Could not save category', caught.message);
        } finally {
            setSaving(false);
        }
    }

    async function saveEdit(event) {
        event.preventDefault();
        setSaving(true);
        try {
            await adminSend(`/api/admin/categories/${editing.id}`, body({ ...editing, slug: editing.slug }), 'PATCH');
            success('Category updated');
            setEditing(null);
            list.reload();
        } catch (caught) {
            error('Could not update category', caught.errors?.parent_id?.[0] ?? caught.message);
        } finally {
            setSaving(false);
        }
    }

    async function toggleActive(item) {
        const next = !item.is_active;
        setBusyId(item.id);
        list.mutateRows((rows) => rows.map((row) => (row.id === item.id ? { ...row, is_active: next } : row)));
        try {
            await adminSend(`/api/admin/categories/${item.id}`, body({ ...item, is_active: next, parent_id: item.parent_id ?? '' }), 'PATCH');
            success(next ? 'Category activated' : 'Category deactivated');
        } catch (caught) {
            error('Could not update category', caught.message);
            list.reload();
        } finally {
            setBusyId(null);
        }
    }

    async function remove(item) {
        const ok = await confirm({
            title: 'Delete category?',
            message: item.children_count > 0
                ? `"${item.name}" has ${item.children_count} subcategor${item.children_count === 1 ? 'y' : 'ies'}. They will become top-level categories.`
                : 'This action cannot be undone.',
            confirmLabel: 'Delete',
        });
        if (!ok) return;
        try {
            await adminSend(`/api/admin/categories/${item.id}`, undefined, 'DELETE');
            success('Category deleted');
            list.reload();
        } catch (caught) {
            error('Could not delete category', caught.message);
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader eyebrow="Catalogue" title="Categories" subtitle="Build a tree: top-level categories with subcategories beneath them." />

            <form onSubmit={create} className="space-y-4 rounded-3xl border border-line bg-paper p-5 shadow-soft md:p-6">
                <h2 className="font-display text-lg">Add a category or subcategory</h2>
                <CategoryForm value={form} onChange={setForm} options={options} />
                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted">{optionsLoaded && form.parent_id ? 'This will be created as a subcategory.' : 'Pick a parent to create a subcategory.'}</p>
                    <Button type="submit" loading={saving} loadingLabel="Saving…"><Icon name="plus" className="h-4 w-4" /> Add</Button>
                </div>
            </form>

            <FilterBar list={list} search="Search categories" fields={fields} exportConfig={{ endpoint: '/api/admin/categories', filename: 'categories', columns: EXPORT_COLUMNS }} />

            <ListBody list={list} empty={<EmptyFiltered list={list} title="No categories yet" body="Add a category above to organise your products." icon="tag" />}>
                <table className="ui-table">
                    <thead><tr><th>Category</th><th>Contains</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                    <tbody>
                        {list.rows.map((item) => (
                            <tr key={item.id}>
                                <td>
                                    <p className="font-semibold">
                                        {item.parent && <span className="font-normal text-muted">{item.parent.name} › </span>}
                                        {item.name}
                                    </p>
                                    <p className="text-xs text-muted">/{item.slug}</p>
                                </td>
                                <td>
                                    <span className="inline-flex flex-wrap gap-1.5">
                                        <Badge tone="muted">{item.products_count ?? 0} product{item.products_count === 1 ? '' : 's'}</Badge>
                                        {item.children_count > 0 && <Badge tone="info">{item.children_count} sub</Badge>}
                                        {!item.parent_id && <Badge tone="accent">Top level</Badge>}
                                    </span>
                                </td>
                                <td><Toggle checked={item.is_active} disabled={busyId === item.id} onChange={() => toggleActive(item)} /></td>
                                <td className="text-right">
                                    <span className="inline-flex gap-1">
                                        <button type="button" className="cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium text-accent-dark transition hover:bg-accent/10" onClick={() => setEditing({ ...item, parent_id: item.parent_id ? String(item.parent_id) : '' })}>Edit</button>
                                        <button type="button" className="cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium text-danger transition hover:bg-danger/10" onClick={() => remove(item)}>Delete</button>
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ListBody>
            <Pagination list={list} />

            <Modal open={Boolean(editing)} title="Edit category" onClose={() => setEditing(null)} size="md">
                {editing && (
                    <form onSubmit={saveEdit} className="space-y-4">
                        <CategoryForm value={editing} onChange={setEditing} options={options} editingId={editing.id} />
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                            <Button type="submit" loading={saving} loadingLabel="Saving…">Save changes</Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
