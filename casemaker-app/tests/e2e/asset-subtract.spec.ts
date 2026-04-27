import { test, expect } from './fixtures/caseMaker';

const TET_BUILDER = `
  function buildTet() {
    const positions = new Float32Array([0,0,0, 30,0,0, 0,30,0, 0,0,30]);
    const tris = [[0,2,1],[0,1,3],[0,3,2],[1,2,3]];
    const HEADER = 80, TRI = 50;
    const buf = new ArrayBuffer(HEADER + 4 + tris.length * TRI);
    const dv = new DataView(buf);
    dv.setUint32(HEADER, tris.length, true);
    let off = HEADER + 4;
    for (const [a,b,c] of tris) {
      off += 12;
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

test('importing an STL with subtract visibility changes shell mesh stats', async ({ cm, page }) => {
  await cm.ready();
  await page.evaluate(async () => {
    await window.__caseMaker!.loadBuiltinBoard('rpi-4b');
  });
  const before = await page.evaluate(() => window.__caseMaker!.getMeshStats('shell')!);

  await page.evaluate(async (builder) => {
    new Function(builder + 'window.__buildTet = buildTet;')();
    const b64 = (window as unknown as { __buildTet: () => string }).__buildTet();
    const id = await window.__caseMaker!.importStlAsset('cut.stl', b64);
    const project = window.__caseMaker!.getProject();
    const next = JSON.parse(JSON.stringify(project));
    const asset = next.externalAssets.find((a: { id: string }) => a.id === id);
    asset.visibility = 'subtract';
    asset.transform.position = [20, 20, 0];
    await window.__caseMaker!.setProject(next);
  }, TET_BUILDER);

  const after = await page.evaluate(() => window.__caseMaker!.getMeshStats('shell')!);
  expect(after.triangleCount).not.toBe(before.triangleCount);
});
