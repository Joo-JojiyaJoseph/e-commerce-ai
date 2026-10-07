// Copies the pose-detection model + WebAssembly out of node_modules into public/, so body detection
// is served from your own site (no third-party CDN, works offline, nothing leaves the device).
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'node_modules', '@mediapipe', 'pose');
const to = join(root, 'public', 'mediapipe', 'pose');

// "lite" and "full" models only (skips the 27 MB "heavy" model).
const wanted = /^(pose\.js|pose_web\.binarypb|pose_landmark_(lite|full)\.tflite|pose_solution_.*\.(js|wasm|data))$/;

if (!existsSync(from)) {
    console.warn('[copy-mediapipe] @mediapipe/pose is not installed; run "npm install". Virtual try-on will be unavailable.');
    process.exit(0);
}

mkdirSync(to, { recursive: true });
const copied = readdirSync(from).filter((file) => wanted.test(file));
copied.forEach((file) => cpSync(join(from, file), join(to, file)));
console.log(`[copy-mediapipe] copied ${copied.length} files to public/mediapipe/pose`);
