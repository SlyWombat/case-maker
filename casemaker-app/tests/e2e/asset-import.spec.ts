import { test, expect } from './fixtures/caseMaker';

// Build a tiny binary STL as base64 inside the page so we don't need fixtures on disk.
const TET_BUILDER = `
  function buildTet() {
    const positions = new Float32Array([0,0,0, 10,0,0, 0,10,0, 0,0,10]);
    const tris = [[0,2,1],[0,1,3],[0,3,2],[1,2,3]];
    const HEADER = 80, TRI = 50;
    const buf = new ArrayBuffer(HEADER + 4 + tris.length * TRI);
    const dv = new DataView(buf);
    dv.setUint32(HEADER, tris.length, true);
    let off = HEADER + 4;
    for (const [a,b,c] of tris) {
      off += 12; // skip normal
      for (const idx of [a,b,c]) {
        dv.setFloat32(off, positions[idx*3], true);
        dv.setFloat32(off+4, positions[idx*3+1], true);
        dv.setFloat32(off+8, positions[idx*3+2], true);
        off += 12;
      }
      off += 2;
    }
    let bin = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
`;

test('STL import: file becomes a reference asset and shows in project', async ({ cm, page }) => {
  await cm.ready();
  await page.evaluate(async () => {
    await window.__caseMaker!.loadBuiltinBoard('rpi-4b');
  });
  const assetId = await page.evaluate(async (builder) => {
    new Function(builder + 'window.__buildTet = buildTet;')();
    const b64 = (window as unknown as { __buildTet: () => string }).__buildTet();
    return await window.__caseMaker!.importStlAsset('tet.stl', b64);
  }, TET_BUILDER);
  expect(assetId).toMatch(/^asset-/);
  const project = await page.evaluate(() => window.__caseMaker!.getProject());
  expect(project.externalAssets.length).toBe(1);
  expect(project.externalAssets[0].name).toBe('tet.stl');
  expect(project.externalAssets[0].format).toBe('stl');
  expect(project.externalAssets[0].visibility).toBe('reference');
});
