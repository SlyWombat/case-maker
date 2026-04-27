import { test, expect } from './fixtures/caseMaker';

test('clone board → edit PCB X → shell bbox grows accordingly', async ({ cm, page }) => {
  await cm.ready();
  await page.evaluate(async () => {
    await window.__caseMaker!.loadBuiltinBoard('rpi-4b');
  });
  const before = await page.evaluate(() => window.__caseMaker!.getMeshStats('shell')!.bbox);
  await page.evaluate(async () => {
    await window.__caseMaker!.cloneBoardForEditing();
    await window.__caseMaker!.patchBoardPcb({ x: 100 });
  });
  const after = await page.evaluate(() => window.__caseMaker!.getMeshStats('shell')!.bbox);
  // Pi 4B PCB X = 85; bumped to 100 → shell X grows by ~15mm.
  const beforeXSpan = before.max[0] - before.min[0];
  const afterXSpan = after.max[0] - after.min[0];
  expect(afterXSpan - beforeXSpan).toBeCloseTo(15, 0);
});

test('add mounting hole creates a 5th boss in the scene', async ({ cm, page }) => {
  await cm.ready();
  await page.evaluate(async () => {
    await window.__caseMaker!.loadBuiltinBoard('rpi-4b');
    await window.__caseMaker!.cloneBoardForEditing();
    await window.__caseMaker!.addMountingHole();
  });
  const project = await page.evaluate(() => window.__caseMaker!.getProject());
  expect(project.board.mountingHoles.length).toBe(5);
});
