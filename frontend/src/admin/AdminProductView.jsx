import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminGet, adminSend, upload } from '../api.js';
import { Button, PageHeader, Toggle } from '../components/common.jsx';
import { useConfirm } from '../feedback.jsx';
import { useToast } from '../toast.jsx';

export default function AdminProductView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { push } = useToast();
    const confirm = useConfirm();
    const [product, setProduct] = useState(null);
    const [toggling, setToggling] = useState(false);

    function load() {
        return adminGet(`/api/admin/products/${id}`).then(({ data }) => setProduct(data));
    }

    useEffect(() => {
        load();
    }, [id]);

    if (!product) {
        return <p className="text-sm text-muted">Loading…</p>;
    }

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Catalogue"
                title={product.name}
                subtitle={product.description}
                actions={(
                    <div className="flex flex-wrap items-center gap-3">
                        <Toggle
                            checked={product.status === 'active'}
                            disabled={toggling}
                            onLabel="Active"
                            offLabel={product.status === 'archived' ? 'Archived' : 'Inactive'}
                            onChange={async (value) => {
                                const status = value ? 'active' : 'draft';
                                setToggling(true);
                                try {
                                    await adminSend('/api/admin/products/bulk-status', { ids: [product.id], status });
                                    setProduct((current) => ({ ...current, status }));
                                    push(value ? 'Product activated' : 'Product deactivated');
                                } catch {
                                    push('Could not update status');
                                } finally {
                                    setToggling(false);
                                }
                            }}
                        />
                        <Button as={Link} to={`/admin/products/${id}/edit`}>Edit</Button>
                        <Button
                            type="button"
                            variant="danger"
                            onClick={async () => {
                                const ok = await confirm({
                                    title: 'Delete product?',
                                    message: 'This product will be archived. You can restore it from the archived list.',
                                    confirmLabel: 'Delete',
                                });
                                if (!ok) {
                                    return;
                                }
                                await adminSend(`/api/admin/products/${id}`, undefined, 'DELETE');
                                navigate('/admin/products');
                            }}
                        >
                            Delete
                        </Button>
                    </div>
                )}
            />
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-muted">SKU</dt><dd>{product.variants?.[0]?.sku}</dd></div>
                <div><dt className="text-muted">Brand</dt><dd>{product.brand?.name ?? '—'}</dd></div>
                <div><dt className="text-muted">Categories</dt><dd>{product.categories?.map((category) => category.name).join(', ') || '—'}</dd></div>
                <div><dt className="text-muted">Updated</dt><dd>{product.updated_at}</dd></div>
            </dl>
            <section>
                <h2 className="mb-3 font-medium">Images</h2>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {product.images?.map((image) => (
                        <div key={image.id} className="overflow-hidden rounded-lg border border-line bg-paper">
                            <img src={image.url} alt={image.alt_text ?? ''} className="aspect-square w-full object-cover" />
                            <div className="flex items-center justify-between p-2 text-xs">
                                {image.is_primary ? <span className="font-medium">PRIMARY</span> : (
                                    <button type="button" className="cursor-pointer hover:underline" onClick={() => adminSend(`/api/admin/products/${id}/images/${image.id}/primary`).then(() => load().then(() => push('Primary image updated')))}>Set primary</button>
                                )}
                                <label className="cursor-pointer underline">
                                    Replace
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        className="hidden"
                                        onChange={async (event) => {
                                            const file = event.target.files?.[0];
                                            if (!file) return;
                                            const body = new FormData();
                                            body.append('image', file);
                                            await upload(`/api/admin/products/${id}/images/${image.id}/replace`, body);
                                            await load();
                                            push('Image replaced');
                                        }}
                                    />
                                </label>
                                <button type="button" className="cursor-pointer text-danger hover:underline" onClick={() => adminSend(`/api/admin/products/${id}/images/${image.id}`, undefined, 'DELETE').then(() => load())}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
                <label className="mt-4 inline-block cursor-pointer text-sm underline">
                    Add images
                    <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={async (event) => {
                            for (const file of event.target.files ?? []) {
                                const body = new FormData();
                                body.append('image', file);
                                await upload(`/api/admin/products/${id}/images`, body);
                            }
                            await load();
                            push('Images uploaded');
                        }}
                    />
                </label>
            </section>
            <section>
                <h2 className="mb-3 font-medium">Variants</h2>
                <table className="w-full text-left text-sm">
                    <thead className="text-muted"><tr><th className="py-2">SKU</th><th>Price</th><th>Stock</th></tr></thead>
                    <tbody>
                        {product.variants?.map((variant) => (
                            <tr key={variant.id} className="border-t border-line">
                                <td className="py-2">{variant.sku}</td>
                                <td>{variant.price}</td>
                                <td>{variant.stock}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}
