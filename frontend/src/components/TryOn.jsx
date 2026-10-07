import { useCallback, useEffect, useRef, useState } from 'react';
import { adjustFit, fitGarment, smoothFit } from '../tryonFit.js';
import { Icon } from './icons.jsx';

const POSE_BASE = '/mediapipe/pose/';
const MAX_PHOTO_SIDE = 1280;

let poseLibrary;

/** Loads the self-hosted pose detector once, only when someone opens the try-on. */
function loadPoseLibrary() {
    poseLibrary ??= new Promise((resolve, reject) => {
        if (window.Pose) {
            resolve(window.Pose);
            return;
        }
        const script = document.createElement('script');
        script.src = `${POSE_BASE}pose.js`;
        script.async = true;
        script.onload = () => (window.Pose ? resolve(window.Pose) : reject(new Error('Body detection did not start.')));
        script.onerror = () => {
            poseLibrary = null;
            reject(new Error('Could not load body detection. Check your connection and try again.'));
        };
        document.head.appendChild(script);
    });
    return poseLibrary;
}

const HINTS = {
    searching: 'Looking for you… stand back so your shoulders and hips are in view.',
    tracking: 'Fitted. Use the sliders if it needs a nudge.',
    shoulders: 'I can see you, but not your shoulders. Step back a little.',
    hips: 'I can see you, but not your hips. Step back a little so your waist is in view.',
    'no-body': "I couldn't find a body in this picture. Try a clearer, front-facing photo with good light.",
    'too-small': 'You look very small in the frame. Move closer.',
};

function loadGarment(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous'; // needed so "Take photo" can export the canvas
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("The garment picture couldn't be loaded."));
        image.src = url;
    });
}

/** Downscales large uploads so detection stays fast, and returns a canvas. */
async function readPhoto(file) {
    const url = URL.createObjectURL(file);
    try {
        const image = await new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error("That file isn't a picture we can read."));
            el.src = url;
        });
        const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas;
    } finally {
        URL.revokeObjectURL(url);
    }
}

/**
 * Virtual try-on: finds the shopper's body in a live camera feed or an uploaded photo and places the
 * product's garment image on it. Everything runs in the browser, so the camera feed and photos never
 * leave the device. It is an approximate overlay (a flat picture fitted to the torso), not cloth simulation.
 */
export default function TryOn({ garmentUrl, type = 'top', name = 'this item' }) {
    const canvasRef = useRef(null);
    const videoRef = useRef(null);
    const poseRef = useRef(null);
    const garmentRef = useRef(null);
    const streamRef = useRef(null);
    const frameRef = useRef(0);
    const busyRef = useRef(false);
    const liveRef = useRef(false);
    const modeRef = useRef('idle');
    const lastRef = useRef({ source: null, landmarks: null });
    const fitRef = useRef(null);
    const tweakRef = useRef({ scale: 1, offset: 0 });
    const resultCount = useRef(0);

    const [mode, setMode] = useState('idle'); // idle | loading | camera | photo
    const [status, setStatus] = useState('searching');
    const [error, setError] = useState('');
    const [tweak, setTweak] = useState({ scale: 1, offset: 0 });
    const [garmentReady, setGarmentReady] = useState(false);
    const [notice, setNotice] = useState('');

    useEffect(() => {
        let cancelled = false;
        setGarmentReady(false);
        loadGarment(garmentUrl)
            .then((image) => {
                if (!cancelled) {
                    garmentRef.current = image;
                    setGarmentReady(true);
                }
            })
            .catch((caught) => !cancelled && setError(caught.message));
        return () => { cancelled = true; };
    }, [garmentUrl]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const { source, landmarks } = lastRef.current;
        if (!canvas || !source) return;

        const width = source.videoWidth || source.naturalWidth || source.width;
        const height = source.videoHeight || source.naturalHeight || source.height;
        if (!width || !height) return;
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        const ctx = canvas.getContext('2d');
        const mirrored = modeRef.current === 'camera';
        ctx.save();
        if (mirrored) {
            ctx.translate(width, 0);
            ctx.scale(-1, 1); // selfie view: only the camera picture is flipped, never the garment
        }
        ctx.drawImage(source, 0, 0, width, height);
        ctx.restore();

        const garment = garmentRef.current;
        let next = { ok: false, reason: 'searching' };
        if (garment && landmarks) {
            const raw = fitGarment(landmarks, { type, mirrored, width, height, imageAspect: garment.naturalWidth / garment.naturalHeight });
            next = raw.ok ? smoothFit(fitRef.current, raw, liveRef.current ? 0.45 : 1) : raw;
        } else if (garment && !landmarks && modeRef.current !== 'camera') {
            next = { ok: false, reason: 'no-body' };
        }

        if (next.ok) {
            fitRef.current = next;
            const placed = adjustFit(next, tweakRef.current);
            ctx.save();
            ctx.translate(placed.cx, placed.cy);
            ctx.rotate(placed.rotation);
            ctx.globalAlpha = 0.97;
            ctx.drawImage(garment, -placed.w / 2, -placed.h / 2, placed.w, placed.h);
            ctx.restore();
            setStatus((current) => (current === 'tracking' ? current : 'tracking'));
        } else {
            setStatus(next.reason);
        }
    }, [type]);

    useEffect(() => { draw(); }, [garmentReady, draw]);

    const stopCamera = useCallback(() => {
        liveRef.current = false;
        cancelAnimationFrame(frameRef.current);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
    }, []);

    useEffect(() => () => {
        stopCamera();
        poseRef.current?.close?.()?.catch?.(() => undefined);
    }, [stopCamera]);

    async function getPose(staticImage) {
        const Pose = await loadPoseLibrary();
        if (!poseRef.current) {
            poseRef.current = new Pose({ locateFile: (file) => `${POSE_BASE}${file}` });
            poseRef.current.onResults((results) => {
                resultCount.current += 1;
                lastRef.current = { source: results.image, landmarks: results.poseLandmarks ?? null };
                draw();
            });
        }
        // The web build has no "static image" flag. It tracks a person from frame to frame, so unrelated pictures
        // must start from a clean slate (reset) or it keeps "finding" the last body in the next photo.
        poseRef.current.setOptions({ modelComplexity: 1, smoothLandmarks: !staticImage, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        await poseRef.current.reset?.();
        return poseRef.current;
    }

    async function startCamera() {
        setError('');
        setNotice('');
        fitRef.current = null;
        stopCamera();
        modeRef.current = 'camera';
        setMode('loading');
        setStatus('searching');

        try {
            if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser can\'t use the camera here. Try uploading a photo instead (the camera needs a secure https page).');
            const [pose, stream] = await Promise.all([
                getPose(false),
                navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } }, audio: false }),
            ]);
            streamRef.current = stream;
            const video = videoRef.current;
            video.srcObject = stream;
            await video.play();

            setMode('camera');
            liveRef.current = true;
            const loop = async () => {
                if (!liveRef.current) return;
                if (video.readyState >= 2 && !busyRef.current) {
                    busyRef.current = true;
                    try {
                        await pose.send({ image: video });
                    } catch {
                        /* a dropped frame is fine */
                    } finally {
                        busyRef.current = false;
                    }
                }
                frameRef.current = requestAnimationFrame(loop);
            };
            loop();
        } catch (caught) {
            stopCamera();
            modeRef.current = 'idle';
            setMode('idle');
            const denied = caught?.name === 'NotAllowedError' || caught?.name === 'SecurityError';
            const missing = caught?.name === 'NotFoundError' || caught?.name === 'OverconstrainedError';
            setError(denied ? 'Camera access was blocked. Allow it in your browser, or upload a photo instead.' : missing ? 'No camera was found. You can upload a photo instead.' : caught.message);
        }
    }

    async function usePhoto(file) {
        if (!file) return;
        setError('');
        setNotice('');
        stopCamera();
        fitRef.current = null;
        modeRef.current = 'photo';
        setMode('loading');
        setStatus('searching');

        try {
            const [photo, pose] = await Promise.all([readPhoto(file), getPose(true)]);
            setMode('photo');
            lastRef.current = { source: photo, landmarks: null };
            const seen = resultCount.current;
            await pose.send({ image: photo });
            // The detector may not call back at all when it finds nobody; show the picture and say so.
            if (resultCount.current === seen) {
                lastRef.current = { source: photo, landmarks: null };
                draw();
            }
        } catch (caught) {
            modeRef.current = 'idle';
            setMode('idle');
            setError(caught.message);
        }
    }

    function changeTweak(next) {
        tweakRef.current = next;
        setTweak(next);
        if (modeRef.current === 'photo') draw();
    }

    function snapshot(share = false) {
        setNotice('');
        canvasRef.current?.toBlob(async (blob) => {
            if (!blob) {
                setNotice("Couldn't save the picture. If the product image is hosted elsewhere it must allow cross-origin use (CORS).");
                return;
            }
            const file = new File([blob], `try-on-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`, { type: 'image/png' });
            if (share && navigator.canShare?.({ files: [file] })) {
                try {
                    await navigator.share({ files: [file], title: `Me wearing ${name}`, text: `Trying on ${name}` });
                    return;
                } catch (caught) {
                    if (caught?.name === 'AbortError') return;
                }
            }
            const url = URL.createObjectURL(file);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setNotice('Picture saved to your downloads.');
        }, 'image/png');
    }

    function stopAll() {
        stopCamera();
        modeRef.current = 'idle';
        fitRef.current = null;
        lastRef.current = { source: null, landmarks: null };
        setMode('idle');
        setStatus('searching');
    }

    const active = mode === 'camera' || mode === 'photo';
    const busy = mode === 'loading';
    const btn = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50';
    const primary = `${btn} btn-shine bg-accent text-white shadow-[0_10px_24px_-6px_rgb(109_74_255_/_0.7)] hover:-translate-y-0.5`;
    const ghost = `${btn} border border-white/70 bg-white/70 backdrop-blur hover:bg-white`;

    return (
        <section aria-label={`Virtual try-on for ${name}`} data-tryon-status={active ? status : 'idle'} className="space-y-3">
            <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-white/70 to-accent/10">
                <video ref={videoRef} playsInline muted className="hidden" />
                <canvas
                    ref={canvasRef}
                    role="img"
                    aria-label={`Preview of you wearing ${name}`}
                    className={`mx-auto max-h-[34rem] w-full object-contain ${active ? '' : 'hidden'}`}
                />
                {!active && (
                    <div className="grid min-h-80 place-items-center p-6 text-center">
                        <div className="max-w-xs space-y-3">
                            {garmentReady && <img src={garmentUrl} alt="" className="float-slow mx-auto h-40 w-auto object-contain drop-shadow-xl" />}
                            <p className="font-display text-lg font-bold">See how it looks on you</p>
                            <p className="text-sm text-muted">Use your camera, or upload a photo of yourself standing. Everything happens on your device; nothing is uploaded.</p>
                        </div>
                    </div>
                )}
                {busy && (
                    <div className="absolute inset-0 grid place-items-center bg-white/60 backdrop-blur-sm" role="status">
                        <span className="inline-flex items-center gap-2 text-sm font-medium"><span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" /> Getting ready…</span>
                    </div>
                )}
                {active && (
                    <p className="absolute inset-x-3 top-3 rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-xs font-medium backdrop-blur" role="status" aria-live="polite">
                        {HINTS[status] ?? HINTS.searching}
                    </p>
                )}
            </div>

            {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-700">{error}</p>}

            <div className="flex flex-wrap gap-2">
                {!active && (
                    <>
                        <button type="button" className={primary} disabled={busy || !garmentReady} onClick={startCamera}><Icon name="camera" className="h-4 w-4" /> Use camera</button>
                        <label className={`${ghost} ${busy || !garmentReady ? 'pointer-events-none opacity-50' : ''}`}>
                            <Icon name="upload" className="h-4 w-4" /> Upload a photo
                            <input type="file" accept="image/*" className="sr-only" onChange={(event) => { usePhoto(event.target.files?.[0]); event.target.value = ''; }} />
                        </label>
                    </>
                )}
                {active && (
                    <>
                        <button type="button" className={primary} onClick={() => snapshot(false)}><Icon name="download" className="h-4 w-4" /> Save picture</button>
                        <button type="button" className={ghost} onClick={() => snapshot(true)}><Icon name="share" className="h-4 w-4" /> Share</button>
                        <label className={ghost}>
                            <Icon name="upload" className="h-4 w-4" /> New photo
                            <input type="file" accept="image/*" className="sr-only" onChange={(event) => { usePhoto(event.target.files?.[0]); event.target.value = ''; }} />
                        </label>
                        {mode === 'photo' && <button type="button" className={ghost} onClick={startCamera}><Icon name="camera" className="h-4 w-4" /> Camera</button>}
                        <button type="button" className={ghost} onClick={stopAll}><Icon name="stop" className="h-4 w-4" /> Stop</button>
                    </>
                )}
            </div>

            {active && (
                <div className="grid gap-3 rounded-2xl border border-white/70 bg-white/50 p-4 backdrop-blur sm:grid-cols-2">
                    <label className="block text-xs font-medium text-muted">
                        <span className="mb-1 flex justify-between"><span>Size</span><span>{Math.round(tweak.scale * 100)}%</span></span>
                        <input type="range" min="0.7" max="1.4" step="0.01" value={tweak.scale} aria-label="Garment size" onChange={(event) => changeTweak({ ...tweak, scale: Number(event.target.value) })} className="w-full cursor-pointer" />
                    </label>
                    <label className="block text-xs font-medium text-muted">
                        <span className="mb-1 flex justify-between"><span>Position (up / down)</span><span>{tweak.offset > 0 ? '+' : ''}{Math.round(tweak.offset * 100)}%</span></span>
                        <input type="range" min="-0.2" max="0.2" step="0.01" value={tweak.offset} aria-label="Garment position" onChange={(event) => changeTweak({ ...tweak, offset: Number(event.target.value) })} className="w-full cursor-pointer" />
                    </label>
                </div>
            )}

            {notice && <p role="status" className="text-sm text-muted">{notice}</p>}
            <p className="text-xs text-muted">A preview to help you picture it, not an exact size guide. Check the size chart before buying.</p>
        </section>
    );
}
