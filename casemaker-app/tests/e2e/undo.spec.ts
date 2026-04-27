import { test, expect } from './fixtures/caseMaker';

test('undo/redo: parameter change can be reverted and reapplied', async ({ cm, page }) => {
  await cm.ready();
  await page.evaluate(async () => {
    await window.__caseMaker!.loadBuiltinBoard('rpi-4b');
    window.__caseMaker!.clearHistory();
  });
  const baseline = await page.evaluate(() => window.__caseMaker!.getMeshStats('shell')!);

  await page.evaluate(async () => {
    await window.__caseMaker!.patchCase({ wallThickness: 4 });
  });
  const afterPatch = await page.evaluate(() => window.__caseMaker!.getMeshStats('shell')!);
  expect(afterPatch.bbox.max[0]).not.toBeCloseTo(baseline.bbox.max[0], 1);

  await page.evaluate(async () => {
    await window.__caseMaker!.undo();
  });
  const afterUndo = await page.evaluate(() => window.__caseMaker!.getMeshStats('shell')!);
  expect(afterUndo.bbox.max[0]).toBeCloseTo(baseline.bbox.max[0], 1);

  await page.evaluate(async () => {
    await window.__caseMaker!.redo();
  });
  const afterRedo = await page.evaluate(() => window.__caseMaker!.getMeshStats('shell')!);
  expect(afterRedo.bbox.max[0]).toBeCloseTo(afterPatch.bbox.max[0], 1);
});
