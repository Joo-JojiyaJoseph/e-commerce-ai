import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminGet, adminSend, upload } from '../api.js';
import { Button, Input, PageHeader, Select, SectionCard, Textarea, Toggle } from '../components/common.jsx';
import ModelViewer from '../components/ModelViewer.jsx';
import { useToast } from '../toast.jsx';
import CategoryPicker from './kit/CategoryPicker.jsx';
import { useBrandOptions, useCategoryOptions } from './kit/lookups.js';

const emptyVariant = { sku: '', price: '', compare_at_price: '', stock: 0, attributes: { color: '' } };

const toNumber = (value) => (value === '' || value === null || value === undefined || Number.isNaN(Number(value)) ? null : Number(value));

export default function AdminProductForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { success, error } = useToast();
    const editing = Boolean(id);
    const [saving, setSaving] = useState(false);
    const brands = useBrandOptions();
    const { options: categories, loaded: categoriesLoaded } = useCategoryOptions();
    const [fieldErrors, setFieldErrors] = useState({});
    const previousForm = useRef(null);
    const [images, setImages] = useState([]);
    const [files, setFiles] = useState([]);
    const [form, setForm] = useState({
        name: '',
        slug: '',
        description: '',
        status: 'active',
        brand_id: '',
        category_ids: [],
        model_url: '',
        model_ios_url: '',
        ar_placement: '',
        width_cm: '',
        height_cm: '',
        depth_cm: '',
        tryon_url: '',
        tryon_type: '',
        variants: [{ ...emptyVariant }],
    });

    // A field's error disappears the moment that field is edited, rather than lingering until the next save.
    useEffect(() => {
        const before = previousForm.current;
        previousForm.current = form;
        if (!before) return;
        const changed = Object.keys(form).filter((key) => form[key] !== before[key]);
        setFieldErrors((current) => (changed.some((key) => current[key]) ? Object.fromEntries(Object.entries(current).filter(([key]) => !changed.includes(key))) : current));
    }, [form]);

    useEffect(() => {
        if (id) {
            adminGet(`/api/admin/products/${id}`).then(({ data }) => {
                setForm({
                    name: data.name,
                    slug: data.slug,
                    description: data.description ?? '',
                    status: data.status,
                    brand_id: data.brand?.id ?? '',
                    category_ids: (data.categories ?? []).map((category) => category.id),
                    model_url: data.model_url ?? '',
                    model_ios_url: data.model_ios_url ?? '',
                    ar_placement: data.ar_placement ?? '',
                    width_cm: data.width_cm ?? '',
                    height_cm: data.height_cm ?? '',
                    depth_cm: data.depth_cm ?? '',
                    tryon_url: data.tryon_url ?? '',
                    tryon_type: data.tryon_type ?? '',
                    variants: (data.variants ?? []).map((variant) => ({
                        id: variant.id,
                        sku: variant.sku,
                        price: variant.price,
                        compare_at_price: variant.compare_at_price ?? '',
                        stock: variant.stock,
                        attributes: variant.attributes ?? {},
                    })),
                });
                setImages(data.images ?? []);
            });
        }
    }, [id]);

    async function onSubmit(event) {
        event.preventDefault();
        setFieldErrors({});

        if (!categoriesLoaded) {
            setFieldErrors({ category_ids: 'Categories are still loading. Please try again in a moment.' });
            return;
        }

        if (form.category_ids.length === 0 && categories.length > 0) {
            setFieldErrors({ category_ids: 'Choose at least one category so shoppers can find this product.' });
            document.getElementById('category-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        setSaving(true);

        try {
            const payload = {
                ...form,
                brand_id: form.brand_id || null,
                model_url: form.model_url.trim() || null,
                model_ios_url: form.model_ios_url.trim() || null,
                ar_placement: form.ar_placement || null,
                width_cm: toNumber(form.width_cm),
                height_cm: toNumber(form.height_cm),
                depth_cm: toNumber(form.depth_cm),
                tryon_url: form.tryon_url.trim() || null,
                tryon_type: form.tryon_url.trim() ? form.tryon_type || 'top' : null,
                variants: form.variants.map((variant) => ({
                    ...variant,
                    stock: Number(variant.stock),
                    price: Number(variant.price),
                    compare_at_price: variant.compare_at_price === '' ? null : Number(variant.compare_at_price),
                })),
            };
            const response = editing
                ? await adminSend(`/api/admin/products/${id}`, payload, 'PATCH')
                : await adminSend('/api/admin/products', payload);
            const productId = response.data.id;

            for (const file of files) {
                const body = new FormData();
                body.append('image', file);
                await upload(`/api/admin/products/${productId}/images`, body);
            }

            success(editing ? 'Product updated' : 'Product created', editing ? 'Your changes have been saved.' : 'The product is ready to review.');
            navigate(`/admin/products/${productId}`);
        } catch (caught) {
            const errors = Object.fromEntries(Object.entries(caught.errors ?? {}).map(([key, messages]) => [key, messages?.[0]]));
            setFieldErrors(errors);
            error('Could not save product', Object.values(errors)[0] ?? caught.message);
        } finally {
            setSaving(false);
        }
    }

    async function refreshImages() {
        const { data } = await adminGet(`/api/admin/products/${id}`);
        setImages(data.images ?? []);
    }

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <PageHeader
                eyebrow="Catalogue"
                title={editing ? 'Edit product' : 'Add product'}
                actions={(
                    <>
                        {editing && <Button as={Link} to={`/admin/products/${id}`} variant="ghost">View</Button>}
                        <Button as={Link} to="/admin/products" variant="ghost">Cancel</Button>
                    </>
                )}
            />
            <SectionCard title="Basic information">
                <div className="grid gap-4 md:grid-cols-2">
                <Input label="Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                <Input label="Slug" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} />
                <div className="flex items-end pb-1">
                    <Toggle
                        checked={form.status === 'active'}
                        onLabel="Active on storefront"
                        offLabel={form.status === 'archived' ? 'Archived' : 'Draft / hidden'}
                        onChange={(value) => setForm((current) => ({ ...current, status: value ? 'active' : 'draft' }))}
                    />
                </div>
                <Select label="Brand" value={form.brand_id} onChange={(event) => setForm((current) => ({ ...current, brand_id: event.target.value }))}>
                    <option value="">None</option>
                    {brands.map((brand) => <option key={brand.value} value={brand.value}>{brand.label}</option>)}
                </Select>
                <Textarea className="md:col-span-2" label="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
                <div className="md:col-span-2" id="category-section">
                    <span className="mb-1.5 block text-sm font-medium">Category <span className="text-danger">*</span></span>
                    <CategoryPicker
                        value={form.category_ids}
                        options={categories}
                        loading={!categoriesLoaded}
                        error={fieldErrors.category_ids}
                        onChange={(ids) => {
                            setForm((current) => ({ ...current, category_ids: ids }));
                            if (ids.length > 0) setFieldErrors((current) => ({ ...current, category_ids: undefined }));
                        }}
                    />
                </div>
                </div>
            </SectionCard>
            <SectionCard title="Pricing and inventory" subtitle="Each variant has its own SKU, price, and stock.">
                {form.variants.map((variant, index) => (
                    <div key={variant.id ?? index} className="grid gap-3 md:grid-cols-5">
                        <Input label="SKU" value={variant.sku} onChange={(event) => setForm((current) => {
                            const variants = [...current.variants];
                            variants[index] = { ...variants[index], sku: event.target.value };
                            return { ...current, variants };
                        })} />
                        <Input label="Price" type="number" value={variant.price} onChange={(event) => setForm((current) => {
                            const variants = [...current.variants];
                            variants[index] = { ...variants[index], price: event.target.value };
                            return { ...current, variants };
                        })} />
                        <Input label="Compare at" type="number" value={variant.compare_at_price} onChange={(event) => setForm((current) => {
                            const variants = [...current.variants];
                            variants[index] = { ...variants[index], compare_at_price: event.target.value };
                            return { ...current, variants };
                        })} />
                        <Input label="Stock" type="number" value={variant.stock} onChange={(event) => setForm((current) => {
                            const variants = [...current.variants];
                            variants[index] = { ...variants[index], stock: event.target.value };
                            return { ...current, variants };
                        })} />
                        <Input label="Color" value={variant.attributes?.color ?? ''} onChange={(event) => setForm((current) => {
                            const variants = [...current.variants];
                            variants[index] = { ...variants[index], attributes: { ...variants[index].attributes, color: event.target.value } };
                            return { ...current, variants };
                        })} />
                    </div>
                ))}
                <Button type="button" variant="ghost" onClick={() => setForm((current) => ({ ...current, variants: [...current.variants, { ...emptyVariant }] }))}>Add variant</Button>
            </SectionCard>
            <SectionCard title="AR & virtual try-on (optional)" subtitle="Let shoppers see furniture in their own room, or try clothes on themselves. Free to use, and nothing they capture leaves their device.">
                <div className="space-y-5">
                    <div>
                        <h3 className="font-display text-base">See it in the room (furniture, decor)</h3>
                        <div className="mt-3 grid gap-4 md:grid-cols-2">
                            <Input label="3D model link (.glb)" placeholder="https://…/sofa.glb" hint="Needed for 3D and Android AR. Use an https:// link (or a path on this site)." value={form.model_url} error={fieldErrors.model_url} onChange={(event) => setForm((current) => ({ ...current, model_url: event.target.value }))} />
                            <Input label="iPhone AR link (.usdz)" placeholder="https://…/sofa.usdz" hint="Optional. Enables AR on iPhone and iPad." value={form.model_ios_url} error={fieldErrors.model_ios_url} onChange={(event) => setForm((current) => ({ ...current, model_ios_url: event.target.value }))} />
                            <Select label="Where does it go?" value={form.ar_placement} error={fieldErrors.ar_placement} onChange={(event) => setForm((current) => ({ ...current, ar_placement: event.target.value }))}>
                                <option value="">Not set (shopper can resize)</option>
                                <option value="floor">On the floor (sofa, table, rug, lamp)</option>
                                <option value="wall">On a wall (art, mirror, shelf, clock)</option>
                            </Select>
                            <div>
                                <span className="mb-1.5 block text-sm font-medium">Real size (cm)</span>
                                <div className="grid grid-cols-3 gap-2">
                                    {[['width_cm', 'Width'], ['height_cm', 'Height'], ['depth_cm', 'Depth']].map(([key, label]) => (
                                        <input key={key} type="number" min="1" max="10000" step="any" inputMode="decimal" placeholder={label} aria-label={`${label} in centimetres`} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="w-full cursor-text rounded-xl border border-slate-900/10 bg-white px-3 py-2.5 text-sm outline-none" />
                                    ))}
                                </div>
                                {(fieldErrors.width_cm || fieldErrors.height_cm || fieldErrors.depth_cm) && <p role="alert" className="mt-1 text-xs text-danger">{fieldErrors.width_cm || fieldErrors.height_cm || fieldErrors.depth_cm}</p>}
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-muted">When a placement is chosen, AR shows the item at <strong>true size</strong>, so export the .glb at real scale (1 unit = 1 metre). Sizes are shown to shoppers as a label.</p>
                        {/^(https:\/\/|\/)\S+$/i.test(form.model_url.trim()) && (
                            <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium uppercase tracking-wider text-muted">Preview</p>
                                <ModelViewer src={form.model_url.trim()} iosSrc={form.model_ios_url.trim()} placement={form.ar_placement || undefined} className="h-80" alt={form.name || 'Product preview'} />
                                <p className="text-xs text-muted">If nothing appears, the file may block other websites (CORS) or not be a valid .glb.</p>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-900/[0.06] pt-5">
                        <h3 className="font-display text-base">Try it on (clothing)</h3>
                        <div className="mt-3 grid gap-4 md:grid-cols-2">
                            <Input label="Try-on image (PNG)" placeholder="https://…/shirt-front.png" hint="Front-facing, transparent background, no model wearing it." value={form.tryon_url} error={fieldErrors.tryon_url} onChange={(event) => setForm((current) => ({ ...current, tryon_url: event.target.value }))} />
                            <Select label="Garment type" value={form.tryon_type} error={fieldErrors.tryon_type} onChange={(event) => setForm((current) => ({ ...current, tryon_type: event.target.value }))}>
                                <option value="">Top (default)</option>
                                <option value="top">Top: shirt, tee, sweater, jacket</option>
                                <option value="bottom">Bottom: trousers, jeans, skirt</option>
                                <option value="dress">Dress or long coat</option>
                            </Select>
                        </div>
                        {/^(https:\/\/|\/)\S+$/i.test(form.tryon_url.trim()) && (
                            <div className="mt-3 flex items-center gap-4 rounded-2xl border border-white/70 bg-[conic-gradient(#e5e7eb_25%,#fff_0_50%,#e5e7eb_0_75%,#fff_0)] bg-[length:16px_16px] p-3">
                                <img src={form.tryon_url.trim()} alt="Try-on image preview" className="h-28 w-auto max-w-full object-contain" />
                                <p className="rounded-xl bg-white/90 p-2 text-xs text-muted">The checkerboard should show through around the garment. If it's white, the background isn't transparent.</p>
                            </div>
                        )}
                        <p className="mt-2 text-xs text-muted">Cut the garment out (free: Canva, Photoroom or remove.bg) and save as PNG. Host it on your own site or a CDN that allows cross-origin use, so shoppers can save their try-on picture.</p>
                    </div>
                </div>
            </SectionCard>
            <SectionCard title="Images" subtitle="The primary image is used on product cards.">
                <div className="grid gap-3 sm:grid-cols-3">
                    {images.map((image) => (
                        <div key={image.id} className="overflow-hidden rounded-lg border border-line">
                            <img src={image.url} alt={image.alt_text ?? ''} className="aspect-square w-full object-cover" />
                            <div className="flex justify-between p-2 text-xs">
                                {image.is_primary ? <span className="rounded bg-ink px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">Primary</span> : <button type="button" className="cursor-pointer hover:underline" onClick={() => adminSend(`/api/admin/products/${id}/images/${image.id}/primary`).then(refreshImages)}>Set primary</button>}
                                <button type="button" className="cursor-pointer text-danger hover:underline" onClick={() => adminSend(`/api/admin/products/${id}/images/${image.id}`, undefined, 'DELETE').then(refreshImages)}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
                <Input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(event) => setFiles([...event.target.files])} />
                <p className="text-xs text-muted">Existing images are kept. New files are added after save.</p>
            </SectionCard>
            <Button type="submit" loading={saving} loadingLabel="Saving…">{editing ? 'Save product' : 'Create product'}</Button>
        </form>
    );
}
