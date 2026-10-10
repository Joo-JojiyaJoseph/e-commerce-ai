import { useEffect, useMemo, useRef, useState } from 'react';
import { upload } from '../api.js';
import { Button } from '../components/common.jsx';
import { Icon } from '../components/icons.jsx';
import ModelViewer from '../components/ModelViewer.jsx';
import { TEMPLATES, buildModel, defaultParams, templateById } from '../glb/templates.js';
import { useToast } from '../toast.jsx';

/** A template's starting values: its own sensible defaults, or the product's entered size if that size fits this type. */
function startParams(template, size) {
    const base = defaultParams(template);
    const fits = (value, [lo, hi]) => Number(value) >= lo && Number(value) <= hi;
    const usable = size && fits(size.w, template.size.w) && fits(size.h, template.size.h) && fits(size.d, template.size.d);
    return usable ? { ...base, w: Number(size.w), h: Number(size.h), d: Number(size.d) } : base;
}

const field = 'w-full cursor-text rounded-xl border border-slate-900/10 bg-white px-3 py-2 text-sm outline-none';

/** Reads a chosen picture, shrinks it (max 1024 px) and re-encodes it as JPEG so the model file stays small. */
async function readPicture(file) {
    const url = URL.createObjectURL(file);
    try {
        const image = await new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error("That file isn't a picture we can read."));
            el.src = url;
        });
        const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
        if (!blob) throw new Error("Couldn't prepare that picture.");
        return { mime: 'image/jpeg', bytes: new Uint8Array(await blob.arrayBuffer()), preview: canvas.toDataURL('image/jpeg', 0.5) };
    } finally {
        URL.revokeObjectURL(url);
    }
}

/**
 * Builds a true-scale .glb 3D model right in the admin (no Blender needed) from simple parametric templates,
 * previews it live, and saves it to the store. The result is a clean, stylised model of the right size and shape,
 * not a scan of a specific product.
 */
export default function ModelBuilder({ initialSize, onUse }) {
    const { success, error } = useToast();
    const [templateId, setTemplateId] = useState('sofa');
    const template = templateById(templateId);
    const [params, setParams] = useState(() => startParams(templateById('sofa'), initialSize));
    const [built, setBuilt] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [saving, setSaving] = useState(false);
    const [pictureName, setPictureName] = useState('');
    const lastUrl = useRef(null);

    // rebuild the model shortly after any change (cheap, but this keeps typing smooth)
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                const result = buildModel(templateId, params);
                const url = URL.createObjectURL(new Blob([result.bytes], { type: 'model/gltf-binary' }));
                if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
                lastUrl.current = url;
                setBuilt(result);
                setPreviewUrl(url);
            } catch (caught) {
                error('Could not build the model', caught.message);
            }
        }, 220);
        return () => clearTimeout(timer);
    }, [templateId, params]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => () => lastUrl.current && URL.revokeObjectURL(lastUrl.current), []);

    function chooseTemplate(id) {
        // Different things have very different sizes, so each type starts from its own defaults rather than
        // inheriting (and clamping) the previous type's numbers.
        setTemplateId(id);
        setPictureName('');
        setParams(startParams(templateById(id), initialSize));
    }

    const set = (patch) => setParams((current) => ({ ...current, ...patch }));
    const round = params.options?.shape === 'round' && template.id === 'rug';
    const kb = useMemo(() => (built ? Math.max(1, Math.round(built.bytes.length / 1024)) : 0), [built]);

    async function choosePicture(file) {
        if (!file) return;
        try {
            const picture = await readPicture(file);
            setPictureName(file.name);
            set({ image: { mime: picture.mime, bytes: picture.bytes } });
        } catch (caught) {
            error('Could not use that picture', caught.message);
        }
    }

    async function save() {
        if (!built) return;
        setSaving(true);
        try {
            const body = new FormData();
            body.append('model', new File([built.bytes], `${template.id}.glb`, { type: 'model/gltf-binary' }));
            const { data } = await upload('/api/admin/models', body);
            onUse({ url: data.url, placement: built.placement, size: built.sizeCm });
            success('3D model saved', 'It is attached to this product. Save the product to keep it.');
        } catch (caught) {
            error('Could not save the model', caught.errors?.model?.[0] ?? caught.message);
        } finally {
            setSaving(false);
        }
    }

    function download() {
        if (!built) return;
        const link = document.createElement('a');
        link.href = previewUrl;
        link.download = `${template.id}-${built.sizeCm.w}x${built.sizeCm.h}x${built.sizeCm.d}cm.glb`;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    return (
        <div className="space-y-4 rounded-3xl border border-accent/25 bg-accent/[0.04] p-4 md:p-5" data-testid="model-builder">
            <div>
                <h4 className="font-display text-base">3D model builder</h4>
                <p className="text-xs text-muted">Pick a shape, enter the real size, and get a ready-to-use true-scale 3D model. No other software needed.</p>
            </div>

            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Model type">
                {TEMPLATES.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={item.id === templateId}
                        onClick={() => chooseTemplate(item.id)}
                        className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${item.id === templateId ? 'border-accent bg-accent text-white shadow-[0_6px_16px_-4px_rgb(109_74_255_/_0.6)]' : 'border-white/70 bg-white/70 hover:bg-white'}`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div className="space-y-4">
                    <div>
                        <p className="mb-1.5 text-sm font-medium">Real size (cm)</p>
                        <div className="grid grid-cols-3 gap-2">
                            {[['w', 'Width'], ['h', 'Height'], ['d', 'Depth']].map(([key, label]) => (
                                <label key={key} className="block text-xs text-muted">
                                    <span className="mb-1 block">{label}</span>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        step="any"
                                        min={template.size[key][0]}
                                        max={template.size[key][1]}
                                        aria-label={`Model ${label.toLowerCase()} in centimetres`}
                                        disabled={key === 'd' && round}
                                        value={key === 'd' && round ? params.w : params[key]}
                                        onChange={(event) => set({ [key]: event.target.value === '' ? '' : Number(event.target.value) })}
                                        className={`${field} disabled:opacity-50`}
                                    />
                                    <span className="mt-0.5 block text-[10px] text-muted/80">{template.size[key][0]}–{template.size[key][1]}</span>
                                </label>
                            ))}
                        </div>
                        {round && <p className="mt-1 text-xs text-muted">A round rug uses the width as its diameter.</p>}
                    </div>

                    {template.fields.map((item) => (
                        <label key={item.key} className="block text-sm">
                            <span className="mb-1 block font-medium">{item.label}</span>
                            <select
                                aria-label={item.label}
                                className={`${field} cursor-pointer`}
                                value={params.options[item.key] ?? item.value}
                                onChange={(event) => set({ options: { ...params.options, [item.key]: event.target.value } })}
                            >
                                {item.options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                            </select>
                        </label>
                    ))}

                    <div>
                        <p className="mb-1.5 text-sm font-medium">Colours</p>
                        <div className="flex flex-wrap gap-3">
                            {template.colors.map(([key, label]) => (
                                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                                    <input
                                        type="color"
                                        aria-label={`${label} colour`}
                                        value={params.colors[key]}
                                        onChange={(event) => set({ colors: { ...params.colors, [key]: event.target.value } })}
                                        className="h-9 w-9 cursor-pointer rounded-lg border border-slate-900/10 bg-white p-0.5"
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                    </div>

                    {template.acceptsImage && !(template.id === 'wall' && params.options.kind === 'mirror') && !round && (
                        <div>
                            <p className="mb-1.5 text-sm font-medium">{template.id === 'wall' ? 'Picture' : 'Pattern'} <span className="font-normal text-muted">(optional)</span></p>
                            <div className="flex flex-wrap items-center gap-2">
                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/70 bg-white/70 px-3.5 py-2 text-sm font-semibold transition hover:bg-white">
                                    <Icon name="upload" className="h-4 w-4" /> Choose a picture
                                    <input type="file" accept="image/*" className="sr-only" aria-label="Picture for the model" onChange={(event) => { choosePicture(event.target.files?.[0]); event.target.value = ''; }} />
                                </label>
                                {params.image && (
                                    <button type="button" className="cursor-pointer text-sm font-semibold text-danger hover:underline" onClick={() => { set({ image: null }); setPictureName(''); }}>Remove</button>
                                )}
                                {pictureName && <span className="truncate text-xs text-muted">{pictureName}</span>}
                            </div>
                            <p className="mt-1 text-xs text-muted">It is shown on the front of the {template.id === 'wall' ? 'frame' : 'rug'}, and shrunk to keep the file small.</p>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    {previewUrl ? (
                        <ModelViewer src={previewUrl} allowBlob ar={false} alt={`Preview of the ${template.label.toLowerCase()}`} className="h-72" />
                    ) : (
                        <div className="grid h-72 place-items-center rounded-3xl border border-white/70 bg-white/50 text-sm text-muted">Building…</div>
                    )}
                    {built && (
                        <p className="text-xs text-muted" aria-live="polite">
                            Real size <strong className="text-ink">{built.sizeCm.w} × {built.sizeCm.h} × {built.sizeCm.d} cm</strong> · {kb} KB · placed {built.placement === 'wall' ? 'on a wall' : 'on the floor'}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="accent" loading={saving} loadingLabel="Saving…" disabled={!built} onClick={save}>
                    <Icon name="check" className="h-4 w-4" /> Use this model for the product
                </Button>
                <Button type="button" variant="ghost" disabled={!built} onClick={download}><Icon name="download" className="h-4 w-4" /> Download .glb</Button>
            </div>
            <p className="text-xs text-muted">Built from simple shapes, so it is a clean stylised model of the right size, not a scan of your exact product. For a photo-realistic model, scan it with a free app such as Polycam or Luma and paste the link instead.</p>
        </div>
    );
}
