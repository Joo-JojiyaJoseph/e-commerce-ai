import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminGet, adminSend } from '../api.js';
import { Button, IconButton, Input, PageHeader, Toggle } from '../components/common.jsx';
import { Icon } from '../components/icons.jsx';
import { useConfirm } from '../feedback.jsx';
import { useToast } from '../toast.jsx';

export default function AdminProducts() {
    const confirm = useConfirm();
    const { success, error } = useToast();
    const [params, setParams] = useSearchParams();
    const [payload, setPayload] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const q = params.get('q') ?? '';
    const trashed = params.get('trashed') === '1';

    function load() {
        const search = new URLSearchParams();
        if (q) search.set('q', q);
        if (trashed) search.set('trashed', '1');
        return adminGet(`/api/admin/products?${search}`).then(setPayload);
    }

    useEffect(() => {
        load();
    }, [q, trashed]);

    async function toggleStatus(product) {
        const next = product.status !== 'active';
        const status = next ? 'active' : 'draft';
        setBusyId(product.id);
        setPayload((current) => ({
            ...current,
            data: (current?.data ?? []).map((row) => (row.id === product.id ? { ...row, status } : row)),
        }));
        try {
            await adminSend('/api/admin/products/bulk-status', { ids: [product.id], status });
            success(next ? 'Product activated' : 'Product deactivated');
        } catch (caught) {
            error('Could not update product', caught.message);
            load();
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="space-y-5">
            <PageHeader
                eyebrow="Catalogue"
                title="Products"
                subtitle="Catalogue, archive, and restore products."
                actions={<Button as={Link} to="/admin/products/new">Add product</Button>}
            />
            <form
                className="admin-toolbar"
                onSubmit={(event) => {
                    event.preventDefault();
                    setParams({ q: event.target.q.value, trashed: trashed ? '1' : '' });
                }}
            >
                <Input name="q" defaultValue={q} placeholder="Search products" className="min-w-56 flex-1" />
                <Button type="submit">Search</Button>
                <Button type="button" variant={trashed ? 'secondary' : 'ghost'} onClick={() => setParams({ q, trashed: trashed ? '' : '1' })}>
                    {trashed ? 'Viewing archived' : 'Archived'}
                </Button>
            </form>
            <div className="overflow-x-auto rounded-2xl border border-line bg-paper shadow-soft">
                <table className="ui-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Status</th>
                            <th>Stock</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(payload?.data ?? []).length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-10 text-center text-muted">No products match this search.</td>
                            </tr>
                        )}
                        {(payload?.data ?? []).map((product) => (
                            <tr key={product.id}>
                                <td>
                                    <div className="flex items-center gap-3">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt="" className="h-12 w-10 rounded-md object-cover" />
                                        ) : (
                                            <span className="grid h-12 w-10 place-items-center rounded-md bg-canvas font-display text-muted">{product.name.slice(0, 1)}</span>
                                        )}
                                        <div>
                                            <p className="font-medium">{product.name}</p>
                                            <p className="text-xs text-muted">{product.slug}</p>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    {trashed ? (
                                        <span className="text-sm text-muted">Archived</span>
                                    ) : (
                                        <Toggle
                                            checked={product.status === 'active'}
                                            disabled={busyId === product.id}
                                            onChange={() => toggleStatus(product)}
                                        />
                                    )}
                                </td>
                                <td>{product.variants?.reduce((sum, variant) => sum + Number(variant.stock), 0)}</td>
                                <td>
                                    <div className="flex justify-end gap-1">
                                        <Link to={`/admin/products/${product.id}`} className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full hover:bg-canvas" aria-label="View" title="View">
                                            <Icon name="eye" className="h-4 w-4" />
                                        </Link>
                                        <Link to={`/admin/products/${product.id}/edit`} className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full hover:bg-canvas" aria-label="Edit" title="Edit">
                                            <Icon name="pencil" className="h-4 w-4" />
                                        </Link>
                                        {!trashed && (
                                            <IconButton
                                                name="trash"
                                                label="Delete"
                                                onClick={async () => {
                                                    const ok = await confirm({
                                                        title: 'Delete product?',
                                                        message: 'This product will be archived. You can restore it later.',
                                                        confirmLabel: 'Delete',
                                                    });
                                                    if (!ok) {
                                                        return;
                                                    }
                                                    try {
                                                        await adminSend(`/api/admin/products/${product.id}`, undefined, 'DELETE');
                                                        setParams({ q, trashed: trashed ? '1' : '' });
                                                        success('Product archived');
                                                    } catch (caught) {
                                                        error('Could not delete product', caught.message);
                                                    }
                                                }}
                                            />
                                        )}
                                        {trashed && (
                                            <Button type="button" variant="ghost" onClick={() => adminSend(`/api/admin/products/${product.id}/restore`).then(() => setParams({ q, trashed: '1' }))}>
                                                Restore
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
