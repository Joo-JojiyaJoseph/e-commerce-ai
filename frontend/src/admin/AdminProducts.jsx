import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminSend, money } from '../api.js';
import { Button, IconButton, PageHeader, Toggle } from '../components/common.jsx';
import { Icon } from '../components/icons.jsx';
import { useConfirm } from '../feedback.jsx';
import { useToast } from '../toast.jsx';
import FilterBar from './kit/FilterBar.jsx';
import ListBody, { EmptyFiltered } from './kit/ListBody.jsx';
import { useBrandOptions, useCategoryOptions } from './kit/lookups.js';
import Pagination from './kit/Pagination.jsx';
import { useAdminList } from './kit/useAdminList.js';

const stockOf = (product) => product.variants?.reduce((sum, variant) => sum + Number(variant.stock), 0) ?? 0;
const priceOf = (product) => {
    const prices = (product.variants ?? []).map((variant) => Number(variant.price)).filter((price) => !Number.isNaN(price));
    return prices.length ? Math.min(...prices) : null;
};

const EXPORT_COLUMNS = [
    { key: 'name', label: 'Name' },
    { key: 'slug', label: 'Slug' },
    { key: 'status', label: 'Status' },
    { key: 'brand', label: 'Brand', value: (row) => row.brand?.name },
    { key: 'categories', label: 'Categories', value: (row) => (row.categories ?? []).map((category) => category.name).join(' | ') },
    { key: 'skus', label: 'SKUs', value: (row) => (row.variants ?? []).map((variant) => variant.sku).join(' | ') },
    { key: 'price', label: 'Lowest price', numeric: true, value: (row) => priceOf(row) ?? '' },
    { key: 'stock', label: 'Total stock', numeric: true, value: (row) => stockOf(row) },
    { key: 'model_url', label: '3D model', value: (row) => row.meta?.model_url ?? '' },
];

export default function AdminProducts() {
    const confirm = useConfirm();
    const { success, error } = useToast();
    const list = useAdminList('/api/admin/products');
    const { options: categories } = useCategoryOptions();
    const brands = useBrandOptions();
    const [busyId, setBusyId] = useState(null);
    const trashed = list.values.trashed === '1';

    const fields = [
        { key: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'draft', label: 'Draft' }] },
        { key: 'category_id', label: 'Category', type: 'select', options: categories.map((item) => ({ value: item.value, label: `${'— '.repeat(item.depth)}${item.name}` })) },
        { key: 'brand_id', label: 'Brand', type: 'select', options: brands },
        { key: 'stock', label: 'Stock', type: 'select', options: [{ value: 'in', label: 'In stock' }, { value: 'low', label: 'Low (5 or fewer)' }, { value: 'out', label: 'Out of stock' }] },
        { key: 'sort', label: 'Sort by', type: 'select', placeholder: 'Default', options: [{ value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' }, { value: 'name', label: 'Name A–Z' }, { value: 'name_desc', label: 'Name Z–A' }] },
        { key: 'date_from', label: 'Created from', type: 'date' },
        { key: 'date_to', label: 'Created to', type: 'date' },
        { key: 'trashed', label: 'Show archived only', type: 'toggle' },
    ];

    async function toggleStatus(product) {
        const next = product.status !== 'active';
        const status = next ? 'active' : 'draft';
        setBusyId(product.id);
        list.mutateRows((rows) => rows.map((row) => (row.id === product.id ? { ...row, status } : row)));
        try {
            await adminSend('/api/admin/products/bulk-status', { ids: [product.id], status });
            success(next ? 'Product activated' : 'Product deactivated');
        } catch (caught) {
            error('Could not update product', caught.message);
            list.reload();
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
            <FilterBar list={list} search="Search products, SKU or slug" fields={fields} exportConfig={{ endpoint: '/api/admin/products', filename: 'products', columns: EXPORT_COLUMNS }} />
            <ListBody list={list} empty={<EmptyFiltered list={list} title="No products yet" body="Add your first product to start selling." icon="cube" />}>
                <table className="ui-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Stock</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.rows.map((product) => (
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
                                <td className="text-sm text-muted">
                                    {(product.categories ?? []).length ? product.categories.map((category) => category.name).join(', ') : '—'}
                                </td>
                                <td className="tabular-nums">{priceOf(product) === null ? '—' : money(priceOf(product))}</td>
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
                                <td>
                                    <span className={stockOf(product) === 0 ? 'font-semibold text-danger' : stockOf(product) <= 5 ? 'font-semibold text-warning' : ''}>{stockOf(product)}</span>
                                </td>
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
                                                        list.reload();
                                                        success('Product archived');
                                                    } catch (caught) {
                                                        error('Could not delete product', caught.message);
                                                    }
                                                }}
                                            />
                                        )}
                                        {trashed && (
                                            <Button type="button" variant="ghost" onClick={() => adminSend(`/api/admin/products/${product.id}/restore`).then(() => { success('Product restored'); list.reload(); })}>
                                                Restore
                                            </Button>
                                        )}
                                    </div>
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
