/**
 * Fits a garment image onto a body, given pose landmarks (MediaPipe's 33-point model, coordinates 0..1).
 * Pure maths, no DOM, so it can be tested without a browser.
 *
 * Returns { ok: true, cx, cy, w, h, rotation } in canvas pixels (rotation in radians), or { ok: false, reason }.
 * It is an approximation (a flat image placed on the torso), not cloth simulation.
 */
export const LANDMARK = { lShoulder: 11, rShoulder: 12, lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28 };
export const GARMENT_TYPES = ['top', 'bottom', 'dress'];

const VISIBLE = 0.45;
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function fitGarment(landmarks, { type = 'top', mirrored = false, width, height, imageAspect = 1 }) {
    if (!landmarks || landmarks.length < 29 || !(width > 0) || !(height > 0)) return { ok: false, reason: 'no-body' };

    const point = (index) => {
        const l = landmarks[index];
        return { x: (mirrored ? 1 - l.x : l.x) * width, y: l.y * height, v: l.visibility ?? 1 };
    };
    const seen = (...points) => points.every((p) => p.v >= VISIBLE);

    const ls = point(LANDMARK.lShoulder);
    const rs = point(LANDMARK.rShoulder);
    const lh = point(LANDMARK.lHip);
    const rh = point(LANDMARK.rHip);
    const needsShoulders = type !== 'bottom';

    if (needsShoulders && !seen(ls, rs)) return { ok: false, reason: 'shoulders' };
    if (!seen(lh, rh)) return { ok: false, reason: 'hips' };

    const hips = mid(lh, rh);
    const shoulders = seen(ls, rs) ? mid(ls, rs) : { x: hips.x, y: hips.y - dist(lh, rh) * 1.6 };
    const torso = dist(shoulders, hips);
    if (torso < 20) return { ok: false, reason: 'too-small' };

    // unit vector down the torso: lets the garment lean and tilt with the body
    const dir = { x: (hips.x - shoulders.x) / torso, y: (hips.y - shoulders.y) / torso };
    const along = (from, by) => ({ x: from.x + dir.x * by, y: from.y + dir.y * by });
    const shoulderW = seen(ls, rs) ? dist(ls, rs) : dist(lh, rh) * 1.2;
    const hipW = dist(lh, rh);

    let top;
    let bottom;
    let desiredWidth;

    if (type === 'bottom') {
        const la = point(LANDMARK.lAnkle);
        const ra = point(LANDMARK.rAnkle);
        top = along(hips, -0.1 * torso);
        bottom = seen(la, ra) ? mid(la, ra) : along(hips, torso * 1.55);
        desiredWidth = hipW * 1.9;
    } else if (type === 'dress') {
        const lk = point(LANDMARK.lKnee);
        const rk = point(LANDMARK.rKnee);
        top = along(shoulders, -0.12 * torso);
        bottom = seen(lk, rk) ? along(mid(lk, rk), 0.05 * torso) : along(hips, torso * 0.95);
        desiredWidth = Math.max(shoulderW * 1.45, hipW * 1.7);
    } else {
        top = along(shoulders, -0.12 * torso);
        bottom = along(hips, 0.18 * torso);
        desiredWidth = Math.max(shoulderW * 1.45, hipW * 1.5);
    }

    const h = dist(top, bottom);
    if (h < 10) return { ok: false, reason: 'too-small' };

    // keep the picture's proportions within a believable range instead of stretching it wildly
    const aspect = clamp(desiredWidth / h, imageAspect * 0.7, imageAspect * 1.4);
    const centre = mid(top, bottom);

    return { ok: true, cx: centre.x, cy: centre.y, w: h * aspect, h, rotation: Math.atan2(dir.y, dir.x) - Math.PI / 2, dir };
}

/** Applies the shopper's manual size / position tweaks (scale ~0.7-1.4, offset as a fraction of height). */
export function adjustFit(fit, { scale = 1, offset = 0 } = {}) {
    if (!fit?.ok) return fit;
    const shift = offset * fit.h;
    return { ...fit, cx: fit.cx + fit.dir.x * shift, cy: fit.cy + fit.dir.y * shift, w: fit.w * scale, h: fit.h * scale };
}

/** Eases from the previous fit to the next so the garment doesn't jitter on live video. */
export function smoothFit(previous, next, amount = 0.45) {
    if (!previous?.ok || !next?.ok) return next;
    const lerp = (a, b) => a + (b - a) * amount;
    let delta = next.rotation - previous.rotation;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta)); // shortest way round
    return { ...next, cx: lerp(previous.cx, next.cx), cy: lerp(previous.cy, next.cy), w: lerp(previous.w, next.w), h: lerp(previous.h, next.h), rotation: previous.rotation + delta * amount };
}
