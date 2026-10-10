// Validates every 3D model template with the official Khronos glTF validator and checks real-world sizes.
// Run with:  npm run test:glb
import { TEMPLATES, buildModel, defaultParams } from '../src/glb/templates.js';
import validator from 'gltf-validator';
import fs from 'node:fs';

let fails = 0, checked = 0;
const bad = (m) => { console.log('  FAIL', m); fails++; };
const tiny = Uint8Array.from(atob('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='), (c) => c.charCodeAt(0));

async function check(label, id, params, expect) {
  const r = buildModel(id, params);
  const report = await validator.validateBytes(r.bytes);
  const errs = report.issues.messages.filter((m) => m.severity === 0);
  const warns = report.issues.messages.filter((m) => m.severity === 1);
  const [x, y, z] = r.bounds.size.map((v) => v * 100);
  const [mn] = [r.bounds.min];
  const ok = errs.length === 0
    && Math.abs(x - expect.w) < 0.1 && Math.abs(y - expect.h) < 0.1 && Math.abs(z - expect.d) < 0.1;
  checked++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(34)} ${(r.bytes.length/1024).toFixed(0).padStart(4)} KB  ${x.toFixed(1)}×${y.toFixed(1)}×${z.toFixed(1)} cm  tris=${report.info.totalTriangleCount}  validator: ${errs.length} errors, ${warns.length} warnings`);
  if (errs.length) errs.slice(0,3).forEach((e) => console.log('       ', e.code, e.message));
  if (warns.length) warns.slice(0,2).forEach((e) => console.log('       warn', e.code, e.message));
  if (Math.abs(x-expect.w)>=0.1 || Math.abs(y-expect.h)>=0.1 || Math.abs(z-expect.d)>=0.1) bad(`${label}: size ${x.toFixed(2)}×${y.toFixed(2)}×${z.toFixed(2)} ≠ ${expect.w}×${expect.h}×${expect.d}`);
  if (errs.length) bad(label + ': validator errors');
  const floorItem = r.placement === 'floor';
  if (floorItem && Math.abs(r.bounds.min[1]) > 1e-6) bad(label + ': floor item does not rest on y=0 (min y=' + r.bounds.min[1] + ')');
  if (Math.abs((r.bounds.min[0]+r.bounds.max[0])/2) > 1e-6) bad(label + ': not centred in x');
  if (floorItem && Math.abs((r.bounds.min[2]+r.bounds.max[2])/2) > 1e-6) bad(label + ': not centred in z');
  if (!floorItem && Math.abs(r.bounds.min[2]) > 1e-6) bad(label + ': wall item back is not at z=0');
  return r;
}

for (const t of TEMPLATES) {
  const d = defaultParams(t);
  await check(`${t.label} (defaults)`, t.id, d, { w: d.w, h: d.h, d: d.d });
}
// custom sizes + every option value + extreme sizes
await check('Sofa 260×90×100, 4 cushions', 'sofa', { w: 260, h: 90, d: 100, options: { cushions: '4' } }, { w: 260, h: 90, d: 100 });
await check('Sofa 2-seater 150×80×85', 'sofa', { w: 150, h: 80, d: 85, options: { cushions: '2' } }, { w: 150, h: 80, d: 85 });
await check('Table round legs 180×74×90', 'table', { w: 180, h: 74, d: 90, options: { legStyle: 'round' } }, { w: 180, h: 74, d: 90 });
await check('Tiny side table 40×30×30', 'table', { w: 40, h: 30, d: 30 }, { w: 40, h: 30, d: 30 });
await check('Bed king 180×110×200', 'bed', { w: 180, h: 110, d: 200 }, { w: 180, h: 110, d: 200 });
await check('Shelf 8 shelves 100×220×35', 'shelf', { w: 100, h: 220, d: 35, options: { shelves: '8' } }, { w: 100, h: 220, d: 35 });
await check('Mirror 70×160×4', 'wall', { w: 70, h: 160, d: 4, options: { kind: 'mirror' } }, { w: 70, h: 160, d: 4 });
await check('Wall art w/ picture 80×60×3', 'wall', { w: 80, h: 60, d: 3, options: { kind: 'art' }, image: { mime: 'image/jpeg', bytes: tiny } }, { w: 80, h: 60, d: 3 });
await check('Rug with picture 200×140', 'rug', { w: 200, h: 1, d: 140, image: { mime: 'image/jpeg', bytes: tiny } }, { w: 200, h: 1.02, d: 140 });
await check('Round rug Ø150', 'rug', { w: 150, h: 1, d: 999, options: { shape: 'round' } }, { w: 150, h: 1, d: 150 });
for (const r of ['0.2','2','6','15']) await check(`Block corners ${r}`, 'block', { w: 60, h: 40, d: 30, options: { radius: r } }, { w: 60, h: 40, d: 30 });
// bad input is clamped, never produces a broken file
await check('Garbage sizes → safe defaults', 'table', { w: 'abc', h: -5, d: NaN }, { w: 140, h: 75, d: 80 });
await check('Absurd sizes clamp to max', 'chair', { w: 9999, h: 9999, d: 9999 }, { w: 80, h: 130, d: 80 });
await check('Unknown template falls back', 'does-not-exist', {}, { w: 140, h: 75, d: 80 });
// the file's own structure
const r = buildModel('sofa', defaultParams(TEMPLATES.find(t=>t.id==='sofa')));
const dv = new DataView(r.bytes.buffer, r.bytes.byteOffset, r.bytes.byteLength);
if (dv.getUint32(0,true)!==0x46546c67 || dv.getUint32(4,true)!==2 || dv.getUint32(8,true)!==r.bytes.length) bad('GLB header magic/version/length wrong'); else console.log('ok   GLB header: magic "glTF", version 2, declared length = file length');
if (r.bytes.length % 4) bad('file not 4-byte aligned'); else console.log('ok   file length is 4-byte aligned');

console.log(`\n${checked} models checked → ${fails ? fails + ' PROBLEMS' : 'all valid per the official Khronos validator'}`);
process.exit(fails ? 1 : 0);
