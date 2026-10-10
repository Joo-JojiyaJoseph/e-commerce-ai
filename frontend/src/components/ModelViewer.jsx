import { useEffect, useRef, useState } from 'react';
import { assetUrl } from '../api.js';
import { Icon } from './icons.jsx';

let loader;
let libraryReady = false;

/** Loads Google's free <model-viewer> web component once, and only when a model is shown. */
function loadModelViewer() {
    loader ??= import('@google/model-viewer').then((module) => {
        libraryReady = true;
        return module;
    });
    return loader;
}

// https links and same-site paths only (never javascript:/data:). `blob:` is allowed solely for the admin's
// in-browser preview of a model that hasn't been saved yet.
const safe = (url, allowBlob = false) => {
    if (typeof url !== 'string') return null;
    if (allowBlob && /^blob:[^\s]+$/i.test(url)) return url;
    return /^(https:\/\/|\/)[^\s]+$/i.test(url) ? assetUrl(url) : null;
};

/** "Real size: 90 × 180 × 35 cm (W × H × D)", skipping any dimension that isn't set. */
export function sizeLabel({ width_cm: w, height_cm: h, depth_cm: d } = {}) {
    const parts = [['W', w], ['H', h], ['D', d]].filter(([, value]) => Number(value) > 0);
    if (parts.length === 0) return null;
    return `${parts.map(([, value]) => Number(value)).join(' × ')} cm (${parts.map(([letter]) => letter).join(' × ')})`;
}

/**
 * 3D viewer with built-in AR ("view in your room") on supported phones:
 * Android uses Scene Viewer / WebXR with the .glb, iPhone uses Quick Look with the .usdz.
 *
 * - placement "floor" (furniture, rugs) or "wall" (art, mirrors, shelves) tells AR where it may be placed.
 * - when a placement is set the model is shown at true size (pinch-to-resize is disabled), so a sofa really
 *   is sofa-sized in your lounge. The .glb must be exported at real-world scale (1 unit = 1 metre).
 * - on a desktop, where AR can't launch, a QR code lets the shopper open the same view on their phone.
 *
 * Only https:// and same-site paths are accepted, so a bad URL can never become a script.
 */
export default function ModelViewer({ src, iosSrc, poster, alt, className = '', ar = true, placement, dimensions, qrUrl, allowBlob = false }) {
    const viewerRef = useRef(null);
    const [ready, setReady] = useState(libraryReady);
    const [failed, setFailed] = useState(false);
    const [canAR, setCanAR] = useState(null);
    const [qr, setQr] = useState(null);
    const model = safe(src, allowBlob);
    // People who ask their OS for reduced motion shouldn't get a model that spins on its own.
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const touchDevice = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    const size = sizeLabel(dimensions);

    useEffect(() => {
        if (!model) return undefined;
        let cancelled = false;
        // once the library is in, a changed model swaps inside the same viewer (no spinner flash while editing)
        if (!libraryReady) setReady(false);
        setFailed(false);
        loadModelViewer().then(() => !cancelled && setReady(true)).catch(() => !cancelled && setFailed(true));
        return () => { cancelled = true; };
    }, [model]);

    // Whether this device can launch AR is only known once the model has loaded.
    useEffect(() => {
        const el = viewerRef.current;
        if (!ready || !el) return undefined;
        const check = () => setCanAR(Boolean(el.canActivateAR));
        el.addEventListener('load', check);
        if (el.loaded) check();
        return () => el.removeEventListener('load', check);
    }, [ready]);

    const showQr = ar && canAR === false && !touchDevice && Boolean(qrUrl);

    useEffect(() => {
        if (!showQr) return undefined;
        let cancelled = false;
        import('qrcode')
            .then(({ default: QRCode }) => QRCode.toDataURL(qrUrl, { margin: 1, width: 220, errorCorrectionLevel: 'M' }))
            .then((url) => !cancelled && setQr(url))
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, [showQr, qrUrl]);

    if (!model || failed) return null;

    return (
        <div className="space-y-3">
            <div className={`relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-white/70 to-accent/10 ${className}`}>
                {!ready && (
                    <div className="grid h-full min-h-72 place-items-center text-sm text-muted">
                        <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" /> Loading 3D model…</span>
                    </div>
                )}
                {ready && (
                    <model-viewer
                        ref={viewerRef}
                        src={model}
                        ios-src={safe(iosSrc) ?? undefined}
                        poster={safe(poster) ?? undefined}
                        alt={alt ?? '3D model of the product'}
                        // `ar` is a real boolean property on the element: an empty string would be falsy and silently disable AR.
                        ar={ar ? true : undefined}
                        ar-modes="webxr scene-viewer quick-look"
                        ar-placement={placement === 'wall' ? 'wall' : 'floor'}
                        ar-scale={placement ? 'fixed' : 'auto'}
                        camera-controls=""
                        auto-rotate={reducedMotion ? undefined : ''}
                        shadow-intensity="1"
                        environment-image="neutral"
                        interaction-prompt="auto"
                        style={{ width: '100%', height: '100%', minHeight: '20rem', '--poster-color': 'transparent', background: 'transparent' }}
                    >
                        {ar && (
                            <button
                                slot="ar-button"
                                type="button"
                                className="absolute bottom-4 left-1/2 -translate-x-1/2 cursor-pointer rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-6px_rgb(109_74_255_/_0.7)] transition active:scale-95"
                            >
                                {placement === 'wall' ? 'View on your wall' : 'View in your room'}
                            </button>
                        )}
                    </model-viewer>
                )}
            </div>

            {size && (
                <p className="flex items-center gap-2 text-sm text-muted">
                    <Icon name="cube3d" className="h-4 w-4 text-accent" /> Real size: <strong className="text-ink">{size}</strong>
                </p>
            )}

            {showQr && (
                <div className="flex items-center gap-4 rounded-2xl border border-white/70 bg-white/60 p-4 backdrop-blur" data-testid="ar-qr">
                    <span className="grid h-[7.5rem] w-[7.5rem] shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1.5">
                        {qr ? <img src={qr} alt="QR code to open this product in AR on your phone" className="h-full w-full" /> : <Icon name="qr" className="h-8 w-8 text-muted" />}
                    </span>
                    <div className="text-sm">
                        <p className="font-semibold">See it in your own space</p>
                        <p className="mt-1 text-muted">Scan this with your phone camera to place it {placement === 'wall' ? 'on your wall' : 'in your room'} at its real size. Works on recent iPhones and Android phones.</p>
                    </div>
                </div>
            )}
            {ar && canAR === false && touchDevice && (
                <p className="text-sm text-muted">AR isn&apos;t available on this device or browser. Try Safari on iPhone, or Chrome on a recent Android phone.</p>
            )}
        </div>
    );
}
