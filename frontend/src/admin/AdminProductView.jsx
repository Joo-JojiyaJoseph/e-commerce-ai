import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminGet, adminSend, money, upload } from '../api.js';
import { Badge, Button, ErrorState, Skeleton, StatusBadge, Toggle } from '../components/common.jsx';
import { Icon } from '../components/icons.jsx';
import ModelViewer, { sizeLabel } from '../components/ModelViewer.jsx';
import { useConfirm } from '../feedback.jsx';
import { useToast } from '../toast.jsx';
import { useCategoryOptions } from './kit/lookups.js';

const when = (value) => (value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');

function Tile({ label, value, hint, tone }) {
    return (
        <div className="hover-lift rounded-3xl border border-line bg-paper p-5 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
            <p className={`mt-2 font-display text-2xl font-extrabold tabular-nums ${tone ?? ''}`}>{value}</p>
            {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
        </div>
    );
}

export default function AdminProductView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { success, error } = useToast();
    const confirm = useConfirm();
    const { options: categoryOptions } = useCategoryOptions();
    const [product, setProduct] = useState(null);
    const [failed, setFailed] = useState(null);
    const [toggling, setToggling] = useState(false);
    const [busy, setBusy] = useState(false);
    const [activeImage, setActiveImage] = useState(0);

    function load() {
        return adminGet(`/api/admin/products/${id}`)
            .then(({ data }) => { setProduct(data); setFailed(null); })
            .catch(setFailed);
    }

    useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    const paths = useMemo(() => {
        const byId = new Map(categoryOptions.map((item) => [item.id, item]));
        return (product?.categories ?? []).map((category) => ({ id: category.id, label: byId.get(category.id)?.label ?? category.name }));
    }, [categoryOptions, product]);

    if (failed) return <ErrorState title="Could not load this product" body={failed.message} onRetry={load} />;
    if (!product) return <div className="space-y-4"><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></div>;

    const variants = product.variants ?? [];
    const stock = variants.reduce((sum, variant) => sum + Number(variant.stock), 0);
    const prices = variants.map((variant) => Number(variant.price)).filter((price) => !Number.isNaN(price));
    const images = product.images ?? [];
    const current = images[Math.min(activeImage, Math.max(images.length - 1, 0))];

    async function run(task, message) {
        setBusy(true);
        try {
            await task();
            await load();
            if (message) success(message);
        } catch (caught) {
            error('Something went wrong', caught.message);
        } finally {
            setBusy(false);
        }
    }

    async function remove() {
        const ok = await confirm({ title: 'Delete product?', message: 'This product will be archived. You can restore it from the archived list.', confirmLabel: 'Delete' });
        if (!ok) return;
        try {
            await adminSend(`/api/admin/products/${id}`, undefined, 'DELETE');
            success('Product archived');
            navigate('/admin/products');
        } catch (caught) {
            error('Could not delete product', caught.message);
        }
    }

    async function setStatus(value) {
        const status = value ? 'active' : 'draft';
        setToggling(true);
        try {
            await adminSend('/api/admin/products/bulk-status', { ids: [product.id], status });
            setProduct((currentProduct) => ({ ...currentProduct, status }));
            success(value ? 'Product activated' : 'Product deactivated');
        } catch (caught) {
            error('Could not update status', caught.message);
        } finally {
            setToggling(false);
        }
    }

    const imageAction = 'inline-flex cursor-pointer items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition hover:bg-white';

    return (
        <div className="space-y-6">
            <Link to="/admin/products" className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
                <Icon name="arrow-left" className="h-4 w-4" /> All products
            </Link>

            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="font-display text-3xl md:text-4xl">{product.name}</h1>
                        <StatusBadge value={product.status} />
                    </div>
                    {product.description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{product.description}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Toggle checked={product.status === 'active'} disabled={toggling} onLabel="Active" offLabel={product.status === 'archived' ? 'Archived' : 'Inactive'} onChange={setStatus} />
                    <Button as={Link} to={`/admin/products/${id}/edit`}><Icon name="pencil" className="h-4 w-4" /> Edit</Button>
                    <Button type="button" variant="danger" onClick={remove}>Delete</Button>
                </div>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Tile label="Price" value={prices.length ? (Math.min(...prices) === Math.max(...prices) ? money(prices[0]) : `${money(Math.min(...prices))}+`) : '—'} hint={prices.length > 1 ? 'Lowest of several variants' : undefined} />
                <Tile label="In stock" value={stock} hint={stock === 0 ? 'Out of stock' : stock <= 5 ? 'Running low' : 'Healthy'} tone={stock === 0 ? 'text-danger' : stock <= 5 ? 'text-warning' : ''} />
                <Tile label="Variants" value={variants.length} hint={variants.map((variant) => variant.sku).slice(0, 2).join(', ')} />
                <Tile label="Updated" value={when(product.updated_at).split(',')[0]} hint={when(product.updated_at).split(',').slice(1).join(',').trim()} />
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <section className="space-y-3 rounded-3xl border border-line bg-paper p-5 shadow-soft md:p-6">
                    <h2 className="font-display text-lg">Images</h2>
                    {images.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-accent/30 p-8 text-center text-sm text-muted">No images yet. Add one below.</p>
                    ) : (
                        <>
                            <div className="group relative overflow-hidden rounded-2xl bg-white/50">
                                <img src={current.url} alt={current.alt_text ?? product.name} className="aspect-square w-full object-cover" />
                                {current.is_primary && <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">Primary</span>}
                                <div className="absolute inset-x-3 bottom-3 flex flex-wrap justify-end gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                                    {!current.is_primary && <button type="button" disabled={busy} className={imageAction} onClick={() => run(() => adminSend(`/api/admin/products/${id}/images/${current.id}/primary`), 'Primary image updated')}>Set primary</button>}
                                    <label className={imageAction}>
                                        Replace
                                        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => {
                                            const file = event.target.files?.[0];
                                            if (!file) return;
                                            const body = new FormData();
                                            body.append('image', file);
                                            run(() => upload(`/api/admin/products/${id}/images/${current.id}/replace`, body), 'Image replaced');
                                        }} />
                                    </label>
                                    <button type="button" disabled={busy} className={`${imageAction} text-danger`} onClick={() => run(() => adminSend(`/api/admin/products/${id}/images/${current.id}`, undefined, 'DELETE').then(() => setActiveImage(0)), 'Image deleted')}>Delete</button>
                                </div>
                            </div>
                            {images.length > 1 && (
                                <div className="flex flex-wrap gap-2">
                                    {images.map((image, index) => (
                                        <button key={image.id} type="button" aria-label={`Show image ${index + 1}`} onClick={() => setActiveImage(index)} className={`h-16 w-16 cursor-pointer overflow-hidden rounded-xl border-2 transition ${image.id === current.id ? 'border-accent' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                                            <img src={image.url} alt="" className="h-full w-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                    <label className="btn-shine inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/70 bg-white/70 px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:bg-white">
                        <Icon name="plus" className="h-4 w-4" /> Add images
                        <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => {
                            const chosen = [...(event.target.files ?? [])];
                            if (!chosen.length) return;
                            run(async () => {
                                for (const file of chosen) {
                                    const body = new FormData();
                                    body.append('image', file);
                                    await upload(`/api/admin/products/${id}/images`, body);
                                }
                            }, `${chosen.length} image${chosen.length === 1 ? '' : 's'} uploaded`);
                        }} />
                    </label>
                </section>

                <div className="space-y-6">
                    <section className="rounded-3xl border border-line bg-paper p-5 text-sm shadow-soft md:p-6">
                        <h2 className="font-display text-lg">Details</h2>
                        <dl className="mt-3 divide-y divide-slate-900/[0.06]">
                            <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted">Brand</dt><dd className="font-medium">{product.brand?.name ?? '—'}</dd></div>
                            <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted">Slug</dt><dd className="font-medium">/{product.slug}</dd></div>
                            <div className="flex items-start justify-between gap-4 py-2.5">
                                <dt className="text-muted">Category</dt>
                                <dd className="flex flex-wrap justify-end gap-1.5">
                                    {paths.length ? paths.map((path) => <Badge key={path.id} tone="accent">{path.label}</Badge>) : <span className="font-medium">—</span>}
                                </dd>
                            </div>
                            {sizeLabel(product) && <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted">Real size</dt><dd className="font-medium">{sizeLabel(product)}</dd></div>}
                            {product.ar_placement && <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted">AR placement</dt><dd className="font-medium capitalize">{product.ar_placement}</dd></div>}
                            <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted">Last updated</dt><dd className="font-medium">{when(product.updated_at)}</dd></div>
                        </dl>
                    </section>

                    <section className="rounded-3xl border border-line bg-paper p-5 shadow-soft md:p-6">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="flex items-center gap-2 font-display text-lg"><Icon name="cube3d" className="h-5 w-5 text-accent" /> 3D & AR</h2>
                            {product.model_url ? <Badge tone="success">Enabled</Badge> : <Badge tone="muted">Not set</Badge>}
                        </div>
                        {product.model_url ? (
                            <div className="mt-3">
                                <ModelViewer src={product.model_url} iosSrc={product.model_ios_url} placement={product.ar_placement} dimensions={product} alt={`3D model of ${product.name}`} className="h-72" />
                                {!product.model_ios_url && <p className="mt-2 text-xs text-muted">Add a .usdz link to enable AR on iPhone as well.</p>}
                            </div>
                        ) : (
                            <p className="mt-3 text-sm text-muted">
                                Add a .glb link so shoppers can rotate this product and place it in their room.{' '}
                                <Link to={`/admin/products/${id}/edit`} className="font-semibold text-accent-dark underline">Add 3D model</Link>
                            </p>
                        )}
                    </section>

                    <section className="rounded-3xl border border-line bg-paper p-5 shadow-soft md:p-6">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="flex items-center gap-2 font-display text-lg"><Icon name="user" className="h-5 w-5 text-accent" /> Virtual try-on</h2>
                            {product.tryon_url ? <Badge tone="success">Enabled</Badge> : <Badge tone="muted">Not set</Badge>}
                        </div>
                        {product.tryon_url ? (
                            <div className="mt-3 flex items-center gap-4">
                                <span className="grid h-28 w-24 shrink-0 place-items-center rounded-2xl border border-white/70 bg-[conic-gradient(#e5e7eb_25%,#fff_0_50%,#e5e7eb_0_75%,#fff_0)] bg-[length:14px_14px] p-1.5">
                                    <img src={product.tryon_url} alt="Try-on garment" className="max-h-full max-w-full object-contain" />
                                </span>
                                <p className="text-sm text-muted">Shoppers can try this on as a <strong className="text-ink">{product.tryon_type ?? 'top'}</strong> using their camera or a photo.</p>
                            </div>
                        ) : (
                            <p className="mt-3 text-sm text-muted">
                                Add a transparent PNG so shoppers can try this on.{' '}
                                <Link to={`/admin/products/${id}/edit`} className="font-semibold text-accent-dark underline">Add try-on image</Link>
                            </p>
                        )}
                    </section>
                </div>
            </div>

            <section className="rounded-3xl border border-line bg-paper p-5 shadow-soft md:p-6">
                <h2 className="font-display text-lg">Variants</h2>
                <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase tracking-wider text-muted">
                            <tr><th className="pb-2 font-semibold">SKU</th><th className="pb-2 font-semibold">Options</th><th className="pb-2 text-right font-semibold">Price</th><th className="pb-2 text-right font-semibold">Stock</th></tr>
                        </thead>
                        <tbody>
                            {variants.map((variant) => {
                                const level = Number(variant.stock);
                                return (
                                    <tr key={variant.id} className="border-t border-slate-900/[0.06]">
                                        <td className="py-3 font-medium">{variant.sku}</td>
                                        <td className="py-3 text-muted">{Object.entries(variant.attributes ?? {}).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join(' · ') || '—'}</td>
                                        <td className="py-3 text-right tabular-nums">
                                            {money(variant.price)}
                                            {variant.compare_at_price && <span className="ml-2 text-xs text-muted line-through">{money(variant.compare_at_price)}</span>}
                                        </td>
                                        <td className="py-3 text-right">
                                            <span className={`font-semibold tabular-nums ${level === 0 ? 'text-danger' : level <= 5 ? 'text-warning' : ''}`}>{level}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
