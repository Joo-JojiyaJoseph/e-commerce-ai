import { useState } from 'react';
import { adminSend } from '../api.js';
import { Badge, Button, PageHeader } from '../components/common.jsx';
import { useToast } from '../toast.jsx';
import FilterBar from './kit/FilterBar.jsx';
import ListBody, { EmptyFiltered } from './kit/ListBody.jsx';
import Pagination from './kit/Pagination.jsx';
import { useAdminList } from './kit/useAdminList.js';

const FIELDS = [{ key: 'stock', label: 'Stock level', type: 'select', options: [{ value: 'low', label: 'Low (5 or fewer)' }, { value: 'out', label: 'Out of stock' }] }];

const EXPORT_COLUMNS = [
    { key: 'product', label: 'Product', value: (row) => row.product?.name },
    { key: 'sku', label: 'SKU' },
    { key: 'stock', label: 'Stock', numeric: true },
    { key: 'level', label: 'Level', value: (row) => (Number(row.stock) <= 0 ? 'Out of stock' : Number(row.stock) <= 5 ? 'Low' : 'OK') },
    { key: 'price', label: 'Price', numeric: true },
];

function StockBadge({ stock }) {
    const value = Number(stock);
    if (value <= 0) return <Badge tone="danger">Out of stock</Badge>;
    if (value <= 5) return <Badge tone="warning">Low</Badge>;
    return <Badge tone="success">In stock</Badge>;
}

export default function AdminInventory() {
    const { success, error } = useToast();
    const list = useAdminList('/api/admin/inventory', { perPage: 50 });
    const [savingId, setSavingId] = useState(null);

    async function save(event, variant) {
        event.preventDefault();
        const next = Number(event.target.stock.value);
        setSavingId(variant.id);
        try {
            await adminSend(`/api/admin/inventory/${variant.id}`, { stock: next }, 'PATCH');
            list.mutateRows((rows) => rows.map((row) => (row.id === variant.id ? { ...row, stock: next } : row)));
            success('Stock updated', `${variant.sku} is now ${next}.`);
        } catch (caught) {
            error('Could not update stock', caught.message);
        } finally {
            setSavingId(null);
        }
    }

    return (
        <div className="space-y-5">
            <PageHeader eyebrow="Catalogue" title="Inventory" subtitle="Adjust live stock without opening each product." />
            <FilterBar list={list} search="Search SKU or product" fields={FIELDS} exportConfig={{ endpoint: '/api/admin/inventory', filename: 'inventory', columns: EXPORT_COLUMNS }} />
            <ListBody list={list} empty={<EmptyFiltered list={list} title="No variants" body="Add products to track their stock here." icon="archive-box" />}>
                <table className="ui-table">
                    <thead><tr><th>Product</th><th>SKU</th><th>Level</th><th>Stock</th><th /></tr></thead>
                    <tbody>
                        {list.rows.map((variant) => (
                            <tr key={variant.id}>
                                <td className="font-medium">{variant.product?.name}</td>
                                <td className="text-muted">{variant.sku}</td>
                                <td><StockBadge stock={variant.stock} /></td>
                                <td className="font-semibold tabular-nums">{variant.stock}</td>
                                <td>
                                    <form className="flex justify-end gap-2" onSubmit={(event) => save(event, variant)}>
                                        <input key={`${variant.id}-${variant.stock}`} name="stock" type="number" min="0" defaultValue={variant.stock} aria-label={`New stock for ${variant.sku}`} className="w-24 cursor-text rounded-xl border border-slate-900/10 bg-white px-2.5 py-1.5 text-sm" />
                                        <Button type="submit" variant="ghost" loading={savingId === variant.id} loadingLabel="…">Save</Button>
                                    </form>
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
