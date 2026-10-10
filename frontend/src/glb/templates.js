import { ModelBuilder } from './glbBuilder.js';

const cm = (v) => v / 100;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const corners = (sx, sz) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [a * sx, b * sz]);

/**
 * Furniture and decor templates. Sizes are entered in centimetres; every template fills exactly the
 * width x height x depth requested. Floor items rest on y = 0 (centred on their footprint); wall items
 * have their back at z = 0 and extend outwards.
 */
export const TEMPLATES = [
    {
        id: 'table', label: 'Table / desk', placement: 'floor', size: { w: [40, 400, 140], h: [30, 120, 75], d: [30, 300, 80] },
        colors: [['top', 'Top', '#b98b5e'], ['legs', 'Legs', '#2f2f33']],
        fields: [{ key: 'legStyle', label: 'Legs', options: [['square', 'Square'], ['round', 'Round']], value: 'square' }],
        build(b, { w, h, d, colors, options }) {
            const t = clamp(h * 0.07, 0.025, 0.045), ls = clamp(Math.min(w, d) * 0.07, 0.03, 0.07), inset = 0.02 + ls / 2;
            const top = b.material({ color: colors.top, roughness: 0.55 }), legs = b.material({ color: colors.legs, roughness: 0.5, metallic: 0.1 });
            b.roundedBox({ w, h: t, d, r: 0.004, y: h - t / 2, material: top });
            corners(w / 2 - inset, d / 2 - inset).forEach(([x, z]) => (options.legStyle === 'round'
                ? b.cylinder({ r: ls / 2, h: h - t, x, z, y: (h - t) / 2, material: legs })
                : b.box({ w: ls, h: h - t, d: ls, x, z, y: (h - t) / 2, material: legs })));
        },
    },
    {
        id: 'chair', label: 'Chair', placement: 'floor', size: { w: [30, 80, 45], h: [60, 130, 90], d: [30, 80, 50] },
        colors: [['frame', 'Frame', '#6b4a2f'], ['cushion', 'Seat & back', '#7a8ca3']],
        fields: [],
        build(b, { w, h, d, colors }) {
            const seatH = h * 0.47, st = 0.07, ls = 0.04, inset = 0.025 + ls / 2;
            const frame = b.material({ color: colors.frame, roughness: 0.6 }), fabric = b.material({ color: colors.cushion, roughness: 0.9 });
            corners(w / 2 - inset, d / 2 - inset).forEach(([x, z]) => b.box({ w: ls, h: seatH - st, d: ls, x, z, y: (seatH - st) / 2, material: frame }));
            b.roundedBox({ w, h: st, d, r: 0.025, y: seatH - st / 2, material: fabric });
            b.roundedBox({ w, h: h - seatH, d: 0.05, r: 0.02, y: seatH + (h - seatH) / 2, z: -d / 2 + 0.025, material: fabric });
        },
    },
    {
        id: 'sofa', label: 'Sofa', placement: 'floor', size: { w: [100, 400, 200], h: [60, 130, 85], d: [60, 130, 90] },
        colors: [['fabric', 'Fabric', '#6d7f8f'], ['legs', 'Legs', '#3a2a1e']],
        fields: [{ key: 'cushions', label: 'Seat cushions', options: [['2', '2'], ['3', '3'], ['4', '4']], value: '3' }],
        build(b, { w, h, d, colors, options }) {
            const feetH = clamp(h * 0.1, 0.05, 0.12), baseH = h * 0.3, baseTop = feetH + baseH, aw = clamp(w * 0.1, 0.12, 0.2);
            const bd = clamp(d * 0.22, 0.14, 0.24), armTop = h * 0.65, n = Number(options.cushions) || 3, iw = w - 2 * aw;
            const fabric = b.material({ color: colors.fabric, roughness: 0.95 }), legs = b.material({ color: colors.legs, roughness: 0.5 });
            b.roundedBox({ w, h: baseH, d, r: 0.025, y: feetH + baseH / 2, material: fabric });
            [-1, 1].forEach((s) => b.roundedBox({ w: aw, h: armTop - feetH, d, r: 0.04, x: s * (w / 2 - aw / 2), y: feetH + (armTop - feetH) / 2, material: fabric }));
            b.roundedBox({ w: iw, h: h - baseTop, d: bd, r: 0.05, y: baseTop + (h - baseTop) / 2, z: -d / 2 + bd / 2, material: fabric });
            const cw = iw / n, ch = h * 0.16, cd = d - bd;
            for (let i = 0; i < n; i += 1) b.roundedBox({ w: cw - 0.004, h: ch, d: cd, r: 0.04, x: -iw / 2 + cw * (i + 0.5), y: baseTop + ch / 2, z: d / 2 - cd / 2, material: fabric });
            corners(w / 2 - 0.08, d / 2 - 0.08).forEach(([x, z]) => b.cylinder({ r: 0.03, rTop: 0.022, h: feetH, x, z, y: feetH / 2, material: legs }));
        },
    },
    {
        id: 'bed', label: 'Bed', placement: 'floor', size: { w: [80, 220, 160], h: [75, 160, 100], d: [160, 240, 210] },
        colors: [['frame', 'Frame', '#8a6a4f'], ['mattress', 'Mattress', '#f1efe9'], ['pillow', 'Pillows', '#ffffff']],
        fields: [],
        build(b, { w, h, d, colors }) {
            const legH = 0.1, frameH = clamp(h * 0.28, 0.2, 0.32), mh = 0.22, hb = 0.08;
            const frame = b.material({ color: colors.frame, roughness: 0.6 }), sheet = b.material({ color: colors.mattress, roughness: 0.95 }), pillow = b.material({ color: colors.pillow, roughness: 0.95 });
            b.box({ w, h, d: hb, y: h / 2, z: -d / 2 + hb / 2, material: frame });
            b.roundedBox({ w, h: frameH, d: d - hb, r: 0.01, y: legH + frameH / 2, z: hb / 2, material: frame });
            const mTop = legH + frameH + mh, mDepth = d - hb - 0.02;
            b.roundedBox({ w: w - 0.06, h: mh, d: mDepth, r: 0.05, y: legH + frameH + mh / 2, z: -d / 2 + hb + mDepth / 2, material: sheet });
            const pw = clamp((w - 0.06) * 0.42, 0.3, 0.7);
            [-1, 1].forEach((s) => b.roundedBox({ w: pw, h: 0.13, d: 0.38, r: 0.05, x: s * (w - 0.06) * 0.24, y: mTop + 0.06, z: -d / 2 + hb + 0.27, material: pillow }));
        },
    },
    {
        id: 'shelf', label: 'Bookshelf / cabinet', placement: 'floor', size: { w: [30, 300, 80], h: [40, 260, 180], d: [15, 80, 30] },
        colors: [['wood', 'Wood', '#a67c52']],
        fields: [{ key: 'shelves', label: 'Shelves', options: [1, 2, 3, 4, 5, 6, 7, 8].map((v) => [String(v), String(v)]), value: '4' }],
        build(b, { w, h, d, colors, options }) {
            const t = 0.02, plinth = 0.04, wood = b.material({ color: colors.wood, roughness: 0.65 }), back = b.material({ color: colors.wood, roughness: 0.8 });
            [-1, 1].forEach((s) => b.box({ w: t, h, d, x: s * (w / 2 - t / 2), y: h / 2, material: wood }));
            b.box({ w: w - 2 * t, h: t, d, y: h - t / 2, material: wood });
            b.box({ w: w - 2 * t, h: t, d: d - 0.01, y: plinth + t / 2, z: 0.005, material: wood });
            b.box({ w: w - 2 * t, h: h - plinth - t, d: 0.006, y: plinth + t + (h - plinth - 2 * t) / 2, z: -d / 2 + 0.003, material: back });
            const lo = plinth + t, hi = h - t, n = Number(options.shelves) || 4;
            for (let i = 1; i <= n; i += 1) b.box({ w: w - 2 * t, h: t, d: d - 0.012, y: lo + ((hi - lo) * i) / (n + 1), z: 0.004, material: wood });
        },
    },
    {
        id: 'wall', label: 'Wall art / mirror', placement: 'wall', acceptsImage: true, size: { w: [15, 250, 60], h: [15, 250, 90], d: [1, 15, 3] },
        colors: [['frame', 'Frame', '#2b2b2b'], ['panel', 'Panel colour', '#e7ecef']],
        fields: [{ key: 'kind', label: 'Type', options: [['art', 'Picture / poster'], ['mirror', 'Mirror']], value: 'art' }],
        build(b, { w, h, d, colors, options, image }) {
            const fw = clamp(Math.min(w, h) * 0.06, 0.02, 0.06), frame = b.material({ color: colors.frame, roughness: 0.5 });
            b.box({ w, h: fw, d, y: h - fw / 2, z: d / 2, material: frame });
            b.box({ w, h: fw, d, y: fw / 2, z: d / 2, material: frame });
            [-1, 1].forEach((s) => b.box({ w: fw, h: h - 2 * fw, d, x: s * (w / 2 - fw / 2), y: h / 2, z: d / 2, material: frame }));
            const iw = w - 2 * fw, ih = h - 2 * fw;
            const back = b.material({ color: '#3a3a3a', roughness: 0.9 });
            b.box({ w: iw, h: ih, d: 0.004, y: h / 2, z: 0.002, material: back });
            if (options.kind === 'mirror') b.box({ w: iw, h: ih, d: 0.004, y: h / 2, z: d * 0.5, material: b.material({ color: '#dde6ec', roughness: 0.03, metallic: 1 }) });
            else b.quad({ w: iw, h: ih, y: h / 2, z: d * 0.5, material: b.material({ color: colors.panel, roughness: 0.9, image }) });
        },
    },
    {
        id: 'rug', label: 'Rug', placement: 'floor', acceptsImage: true, size: { w: [40, 500, 200], h: [0.5, 5, 1], d: [40, 500, 140] },
        colors: [['rug', 'Colour', '#b5503c']],
        fields: [{ key: 'shape', label: 'Shape', options: [['rect', 'Rectangle'], ['round', 'Round']], value: 'rect' }],
        build(b, { w, h, d, colors, options, image }) {
            const mat = b.material({ color: colors.rug, roughness: 1 });
            if (options.shape === 'round') { b.cylinder({ r: w / 2, h, y: h / 2, segments: 64, material: mat }); return; }
            b.roundedBox({ w, h, d, r: Math.min(h * 0.45, 0.01), y: h / 2, material: mat });
            if (image) b.quad({ w: w - 0.004, h: d - 0.004, y: h + 0.0002, facing: 'y', material: b.material({ color: '#ffffff', roughness: 1, image }) });
        },
    },
    {
        id: 'block', label: 'Plain block (any item)', placement: 'floor', size: { w: [5, 400, 60], h: [5, 300, 60], d: [5, 400, 60] },
        colors: [['body', 'Colour', '#9aa5b1']],
        fields: [{ key: 'radius', label: 'Corners', options: [['0.2', 'Sharp'], ['2', 'Slightly rounded'], ['6', 'Rounded'], ['15', 'Very rounded']], value: '2' }],
        build(b, { w, h, d, colors, options }) {
            b.roundedBox({ w, h, d, r: cm(Number(options.radius) || 2), y: h / 2, material: b.material({ color: colors.body, roughness: 0.6 }) });
        },
    },
];

export const templateById = (id) => TEMPLATES.find((template) => template.id === id) ?? TEMPLATES[0];

export function defaultParams(template) {
    return {
        w: template.size.w[2], h: template.size.h[2], d: template.size.d[2],
        colors: Object.fromEntries(template.colors.map(([key, , value]) => [key, value])),
        options: Object.fromEntries(template.fields.map((field) => [field.key, field.value])),
        image: null,
    };
}

/**
 * Builds a .glb for a template. Sizes in params are centimetres and are clamped to the template's safe range
 * (so a typo can't produce a broken model). Returns the file bytes, the real bounding box in metres, and where AR should place it.
 */
export function buildModel(templateId, params) {
    const template = templateById(templateId);
    const limit = (key) => {
        const [lo, hi, fallback] = template.size[key];
        const v = Number(params[key]);
        return cm(clamp(Number.isFinite(v) && v > 0 ? v : fallback, lo, hi));
    };
    const w = limit('w'), h = limit('h');
    let d = limit('d');
    if (template.id === 'rug' && params.options?.shape === 'round') d = w;
    const builder = new ModelBuilder();
    template.build(builder, {
        w, h, d,
        colors: { ...defaultParams(template).colors, ...(params.colors ?? {}) },
        options: { ...defaultParams(template).options, ...(params.options ?? {}) },
        image: params.image ?? null,
    });
    return { bytes: builder.build(template.label), bounds: builder.bounds(), placement: template.placement, sizeCm: { w: Math.round(w * 1000) / 10, h: Math.round(h * 1000) / 10, d: Math.round(d * 1000) / 10 } };
}
