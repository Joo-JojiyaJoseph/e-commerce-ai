import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminGet, adminSend, upload } from '../api.js';
import { Button, Input, PageHeader, Select, SectionCard, Textarea, Toggle } from '../components/common.jsx';
import { useToast } from '../toast.jsx';

const emptyVariant = { sku: '', price: '', compare_at_price: '', stock: 0, attributes: { color: '' } };

export default function AdminProductForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { success, error } = useToast();
    const editing = Boolean(id);
    const [saving, setSaving] = useState(false);
    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);
    const [images, setImages] = useState([]);
    const [files, setFiles] = useState([]);
    const [form, setForm] = useState({
        name: '',
        slug: '',
        description: '',
        status: 'active',
        brand_id: '',
        category_ids: [],
        variants: [{ ...emptyVariant }],
    });

    useEffect(() => {
        adminGet('/api/admin/brands').then((response) => setBrands(response.data ?? []));
        adminGet('/api/admin/categories').then((response) => setCategories(response.data ?? []));

        if (id) {
            adminGet(`/api/admin/products/${id}`).then(({ data }) => {
                setForm({
                    name: data.name,
                    slug: data.slug,
                    description: data.description ?? '',
                    status: data.status,
                    brand_id: data.brand?.id ?? '',
                    category_ids: (data.categories ?? []).map((category) => category.id),
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
        setSaving(true);

        try {
            const payload = {
                ...form,
                brand_id: form.brand_id || null,
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
            error('Could not save product', caught.message);
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
                    {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                </Select>
                <Textarea className="md:col-span-2" label="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
                <label className="md:col-span-2 block text-sm">
                    <span className="mb-1.5 block font-medium">Categories</span>
                    <div className="flex flex-wrap gap-3">
                        {categories.map((category) => (
                            <label key={category.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 hover:bg-canvas">
                                <input
                                    type="checkbox"
                                    checked={form.category_ids.includes(category.id)}
                                    onChange={(event) => setForm((current) => ({
                                        ...current,
                                        category_ids: event.target.checked
                                            ? [...current.category_ids, category.id]
                                            : current.category_ids.filter((value) => value !== category.id),
                                    }))}
                                />
                                {category.name}
                            </label>
                        ))}
                    </div>
                </label>
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
