import { useEffect, useState } from 'react';
import { adminGet, adminSend } from '../api.js';
import { Button, EmptyState, Input, PageHeader, TableShell } from '../components/common.jsx';
import { useToast } from '../toast.jsx';

export default function AdminInventory() {
    const { success, error } = useToast();
    const [payload, setPayload] = useState(null);
    const [q, setQ] = useState('');
    const [stock, setStock] = useState('');

    function load() {
        const search = new URLSearchParams();
        if (q) search.set('q', q);
        if (stock) search.set('stock', stock);
        return adminGet(`/api/admin/inventory?${search}`).then(setPayload);
    }

    useEffect(() => {
        load();
    }, []);

    const rows = payload?.data ?? [];

    return (
        <div className="space-y-5">
            <PageHeader eyebrow="Catalogue" title="Inventory" subtitle="Adjust live stock without opening each product." />
            <form className="admin-toolbar" onSubmit={(event) => { event.preventDefault(); load(); }}>
                <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="SKU or product" className="min-w-56 flex-1" />
                <select className="cursor-pointer rounded-lg border border-line bg-white px-3 py-2.5 text-sm" value={stock} onChange={(event) => setStock(event.target.value)}>
                    <option value="">All</option>
                    <option value="low">Low stock</option>
                    <option value="out">Out of stock</option>
                </select>
                <Button type="submit">Filter</Button>
            </form>
            <TableShell empty={Boolean(payload) && rows.length === 0} emptyState={<EmptyState title="No variants" body="Try another search or stock filter." icon="archive-box" />}>
                <table className="ui-table">
                    <thead><tr><th>Product</th><th>SKU</th><th>Stock</th><th /></tr></thead>
                    <tbody>
                        {rows.map((variant) => (
                            <tr key={variant.id}>
                                <td className="font-medium">{variant.product?.name}</td>
                                <td className="text-muted">{variant.sku}</td>
                                <td>{variant.stock}</td>
                                <td>
                                    <form
                                        className="flex justify-end gap-2"
                                        onSubmit={async (event) => {
                                            event.preventDefault();
                                            const next = Number(event.target.stock.value);
                                            try {
                                                await adminSend(`/api/admin/inventory/${variant.id}`, { stock: next }, 'PATCH');
                                                success('Stock updated');
                                                load();
                                            } catch (caught) {
                                                error('Could not update stock', caught.message);
                                            }
                                        }}
                                    >
                                        <input name="stock" type="number" min="0" defaultValue={variant.stock} className="w-24 cursor-text rounded-lg border border-line px-2 py-1.5 text-sm" />
                                        <Button type="submit" variant="ghost">Save</Button>
                                    </form>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableShell>
        </div>
    );
}
