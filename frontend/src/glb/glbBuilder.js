/**
 * Tiny glTF 2.0 binary (.glb) writer with just the shapes furniture needs. No dependencies, no DOM, so it
 * runs in the browser and in tests. Output units are METRES, Y is up, +Z faces the viewer, and each
 * template places its origin at the centre of its footprint (floor items rest on y = 0).
 */
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const hexToLinear = (hex) => {
    const h = String(hex).replace('#', '');
    const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.padEnd(6, '0').slice(0, 6);
    const channel = (i) => parseInt(full.slice(i, i + 2), 16) / 255;
    // glTF colours are linear; the colour pickers give sRGB.
    return [0, 2, 4].map((i) => {
        const c = channel(i);
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
};

export class ModelBuilder {
    constructor() {
        this.prims = [];
        this.materials = [];
        this.images = [];
        this.materialKeys = new Map();
    }

    material({ color = '#cccccc', roughness = 0.75, metallic = 0, image = null } = {}) {
        const key = JSON.stringify([color, roughness, metallic, image ? this.images.indexOf(image) : -1]);
        if (this.materialKeys.has(key)) return this.materialKeys.get(key);
        let imageIndex = null;
        if (image) {
            imageIndex = this.images.indexOf(image);
            if (imageIndex < 0) imageIndex = this.images.push(image) - 1;
        }
        const index = this.materials.push({ color, roughness, metallic, imageIndex }) - 1;
        this.materialKeys.set(key, index);
        return index;
    }

    add(positions, normals, uvs, indices, material) {
        this.prims.push({ positions: Float32Array.from(positions), normals: Float32Array.from(normals), uvs: Float32Array.from(uvs), indices, material });
    }

    /** Sharp-edged box, centred at (x, y, z). */
    box({ w, h, d, x = 0, y = 0, z = 0, material }) {
        const hx = w / 2, hy = h / 2, hz = d / 2;
        const faces = [
            { n: [0, 0, 1], v: [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]] },
            { n: [0, 0, -1], v: [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]] },
            { n: [1, 0, 0], v: [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]] },
            { n: [-1, 0, 0], v: [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]] },
            { n: [0, 1, 0], v: [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]] },
            { n: [0, -1, 0], v: [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]] },
        ];
        const pos = [], nor = [], uv = [], idx = [];
        faces.forEach((f, i) => {
            f.v.forEach(([px, py, pz], k) => {
                pos.push(px + x, py + y, pz + z);
                nor.push(...f.n);
                uv.push(k === 1 || k === 2 ? 1 : 0, k >= 2 ? 0 : 1);
            });
            const o = i * 4;
            idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
        });
        this.add(pos, nor, uv, idx, material);
    }

    /** Soft-edged box (cushions, mattresses, rugs): a box whose edges are rounded with radius r. */
    roundedBox({ w, h, d, r = 0.02, x = 0, y = 0, z = 0, material, segments = 4 }) {
        const half = [w / 2, h / 2, d / 2];
        const radius = clamp(r, 0.0005, Math.min(...half) * 0.98);
        const axisCoords = (H) => {
            const out = [];
            for (let i = 0; i <= segments; i += 1) out.push(-H + (radius * i) / segments);
            for (let i = 0; i <= segments; i += 1) out.push(H - radius + (radius * i) / segments);
            return out;
        };
        const coords = half.map(axisCoords);
        const n = coords[0].length;
        const pos = [], nor = [], uv = [], idx = [];
        let base = 0;
        for (let axis = 0; axis < 3; axis += 1) {
            for (const sign of [1, -1]) {
                const [b, c] = [0, 1, 2].filter((a) => a !== axis);
                for (let i = 0; i < n; i += 1) {
                    for (let j = 0; j < n; j += 1) {
                        const P = [0, 0, 0];
                        P[axis] = sign * half[axis];
                        P[b] = coords[b][i];
                        P[c] = coords[c][j];
                        const inner = P.map((v, k) => clamp(v, -(half[k] - radius), half[k] - radius));
                        const delta = P.map((v, k) => v - inner[k]);
                        const len = Math.hypot(...delta) || 1;
                        const nn = delta.map((v) => v / len);
                        pos.push(inner[0] + nn[0] * radius + x, inner[1] + nn[1] * radius + y, inner[2] + nn[2] * radius + z);
                        nor.push(...nn);
                        uv.push(i / (n - 1), j / (n - 1));
                    }
                }
                // pick the winding that faces outward (the right-hand rule differs per face)
                const at = (i, j) => base + i * n + j;
                const p = (k) => [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]];
                const a = p(at(0, 0)), bb = p(at(1, 0)), cc = p(at(0, 1));
                const cross = [(bb[1] - a[1]) * (cc[2] - a[2]) - (bb[2] - a[2]) * (cc[1] - a[1]), (bb[2] - a[2]) * (cc[0] - a[0]) - (bb[0] - a[0]) * (cc[2] - a[2]), (bb[0] - a[0]) * (cc[1] - a[1]) - (bb[1] - a[1]) * (cc[0] - a[0])];
                const outward = cross[axis] * sign > 0;
                for (let i = 0; i < n - 1; i += 1) {
                    for (let j = 0; j < n - 1; j += 1) {
                        const q = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
                        if (outward) idx.push(q[0], q[1], q[2], q[0], q[2], q[3]);
                        else idx.push(q[0], q[2], q[1], q[0], q[3], q[2]);
                    }
                }
                base += n * n;
            }
        }
        this.add(pos, nor, uv, idx, material);
    }

    /** Upright cylinder (or cone frustum when rTop is given), centred at (x, y, z). */
    cylinder({ r, rTop = r, h, x = 0, y = 0, z = 0, segments = 28, material }) {
        const pos = [], nor = [], uv = [], idx = [];
        const slope = (r - rTop) / h;
        for (let i = 0; i <= segments; i += 1) {
            const a = (i / segments) * Math.PI * 2, cx = Math.cos(a), sz = Math.sin(a);
            const nl = Math.hypot(1, slope);
            pos.push(cx * r + x, y - h / 2, sz * r + z); nor.push(cx / nl, slope / nl, sz / nl); uv.push(i / segments, 1);
            pos.push(cx * rTop + x, y + h / 2, sz * rTop + z); nor.push(cx / nl, slope / nl, sz / nl); uv.push(i / segments, 0);
        }
        for (let i = 0; i < segments; i += 1) {
            const o = i * 2;
            idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3);
        }
        for (const [yy, rr, ny] of [[y + h / 2, rTop, 1], [y - h / 2, r, -1]]) {
            if (rr <= 0) continue;
            const c = pos.length / 3;
            pos.push(x, yy, z); nor.push(0, ny, 0); uv.push(0.5, 0.5);
            for (let i = 0; i <= segments; i += 1) {
                const a = (i / segments) * Math.PI * 2;
                pos.push(Math.cos(a) * rr + x, yy, Math.sin(a) * rr + z); nor.push(0, ny, 0); uv.push(0.5 + Math.cos(a) / 2, 0.5 + Math.sin(a) / 2);
            }
            for (let i = 0; i < segments; i += 1) idx.push(...(ny > 0 ? [c, c + i + 2, c + i + 1] : [c, c + i + 1, c + i + 2]));
        }
        this.add(pos, nor, uv, idx, material);
    }

    /** A flat picture plane. facing "z" stands up facing the viewer; "y" lies flat facing up. */
    quad({ w, h, x = 0, y = 0, z = 0, facing = 'z', material }) {
        const hw = w / 2, hh = h / 2;
        if (facing === 'y') {
            this.add([-hw + x, y, hh + z, hw + x, y, hh + z, hw + x, y, -hh + z, -hw + x, y, -hh + z], [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], [0, 1, 1, 1, 1, 0, 0, 0], [0, 1, 2, 0, 2, 3], material);
        } else {
            this.add([-hw + x, -hh + y, z, hw + x, -hh + y, z, hw + x, hh + y, z, -hw + x, hh + y, z], [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], [0, 1, 1, 1, 1, 0, 0, 0], [0, 1, 2, 0, 2, 3], material);
        }
    }

    bounds() {
        const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        this.prims.forEach(({ positions }) => {
            for (let i = 0; i < positions.length; i += 3) for (let k = 0; k < 3; k += 1) { min[k] = Math.min(min[k], positions[i + k]); max[k] = Math.max(max[k], positions[i + k]); }
        });
        return { min, max, size: max.map((v, k) => v - min[k]) };
    }

    /** Assembles the .glb file. */
    build(name = 'Product') {
        const chunks = [];
        let offset = 0;
        const bufferViews = [], accessors = [];
        const push = (bytes, target) => {
            const pad = (4 - (offset % 4)) % 4;
            if (pad) { chunks.push(new Uint8Array(pad)); offset += pad; }
            const view = { buffer: 0, byteOffset: offset, byteLength: bytes.byteLength };
            if (target) view.target = target;
            chunks.push(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)); offset += bytes.byteLength;
            return bufferViews.push(view) - 1;
        };

        const primitives = this.prims.map((prim) => {
            const verts = prim.positions.length / 3;
            const mins = [Infinity, Infinity, Infinity], maxs = [-Infinity, -Infinity, -Infinity];
            for (let i = 0; i < prim.positions.length; i += 3) for (let k = 0; k < 3; k += 1) { mins[k] = Math.min(mins[k], prim.positions[i + k]); maxs[k] = Math.max(maxs[k], prim.positions[i + k]); }
            const idxArray = verts > 65535 ? Uint32Array.from(prim.indices) : Uint16Array.from(prim.indices);
            const acc = (view, type, count, componentType, extra = {}) => accessors.push({ bufferView: view, componentType, count, type, ...extra }) - 1;
            return {
                attributes: {
                    POSITION: acc(push(prim.positions, 34962), 'VEC3', verts, 5126, { min: mins, max: maxs }),
                    NORMAL: acc(push(prim.normals, 34962), 'VEC3', verts, 5126),
                    TEXCOORD_0: acc(push(prim.uvs, 34962), 'VEC2', verts, 5126),
                },
                indices: acc(push(idxArray, 34963), 'SCALAR', idxArray.length, verts > 65535 ? 5125 : 5123),
                material: prim.material,
                mode: 4,
            };
        });

        const imageViews = this.images.map((image) => ({ view: push(image.bytes), mimeType: image.mime }));
        const json = {
            asset: { version: '2.0', generator: 'Webfolks 3D model builder' },
            scene: 0,
            scenes: [{ nodes: [0] }],
            nodes: [{ mesh: 0, name }],
            meshes: [{ name, primitives }],
            materials: this.materials.map((m) => {
                const pbr = { baseColorFactor: [...hexToLinear(m.color), 1], metallicFactor: m.metallic, roughnessFactor: m.roughness };
                if (m.imageIndex !== null) { pbr.baseColorTexture = { index: m.imageIndex }; pbr.baseColorFactor = [1, 1, 1, 1]; }
                return { pbrMetallicRoughness: pbr, doubleSided: false };
            }),
            accessors,
            bufferViews,
            buffers: [{ byteLength: 0 }],
        };
        if (this.images.length) {
            json.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }];
            json.textures = imageViews.map((_, i) => ({ sampler: 0, source: i }));
            json.images = imageViews.map(({ view, mimeType }) => ({ bufferView: view, mimeType }));
        }

        const binPad = (4 - (offset % 4)) % 4;
        const binLength = offset + binPad;
        json.buffers[0].byteLength = binLength;
        const enc = new TextEncoder();
        let jsonBytes = enc.encode(JSON.stringify(json));
        const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
        const padded = new Uint8Array(jsonBytes.length + jsonPad).fill(0x20);
        padded.set(jsonBytes);
        jsonBytes = padded;

        const total = 12 + 8 + jsonBytes.length + 8 + binLength;
        const out = new Uint8Array(total);
        const dv = new DataView(out.buffer);
        dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
        dv.setUint32(12, jsonBytes.length, true); dv.setUint32(16, 0x4e4f534a, true); out.set(jsonBytes, 20);
        const binStart = 20 + jsonBytes.length;
        dv.setUint32(binStart, binLength, true); dv.setUint32(binStart + 4, 0x004e4942, true);
        let cursor = binStart + 8;
        chunks.forEach((chunk) => { out.set(chunk, cursor); cursor += chunk.byteLength; });
        return out;
    }
}
