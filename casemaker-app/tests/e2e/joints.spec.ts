import { test, expect } from './fixtures/caseMaker';

test('snap-fit lid: triangle count grows substantially over flat-lid baseline', async ({
  cm,
  page,
}) => {
  await cm.ready();
  await page.evaluate(async () => {
    await window.__caseMaker!.loadBuiltinBoard('rpi-4b');
    await window.__caseMaker!.patchCase({ joint: 'flat-lid' });
  });
  const flat = await page.evaluate(() => window.__caseMaker!.getMeshStats('lid')!);
  await page.evaluate(async () => {
    await window.__caseMaker!.patchCase({ joint: 'snap-fit' });
  });
  const snap = await page.evaluate(() => window.__caseMaker!.getMeshStats('lid')!);
  expect(snap.triangleCount).toBeGreaterThan(flat.triangleCount);
  // Snap-fit lid extends downward by ~4mm via the lip ring.
  const flatHeight = flat.bbox.max[2] - flat.bbox.min[2];
  const snapHeight = snap.bbox.max[2] - snap.bbox.min[2];
  expect(snapHeight - flatHeight).toBeGreaterThanOrEqual(2);
});

test('sliding lid: lid Y span is shorter than outer shell Y span', async ({ cm, page }) => {
  await cm.ready();
  await page.evaluate(async () => {
    await window.__caseMaker!.loadBuiltinBoard('rpi-4b');
    await window.__caseMaker!.patchCase({ joint: 'sliding' });
  });
  const result = await page.evaluate(() => ({
    shell: window.__caseMaker!.getMeshStats('shell')!.bbox,
    lid: window.__caseMaker!.getMeshStats('lid')!.bbox,
  }));
  const shellYSpan = result.shell.max[1] - result.shell.min[1];
  const lidYSpan = result.lid.max[1] - result.lid.min[1];
  expect(lidYSpan).toBeLessThan(shellYSpan);
});

test('ventilation slots: enabling reduces shell triangle count differential vs disabled', async ({
  cm,
  page,
}) => {
  await cm.ready();
  await page.evaluate(async () => {
    await window.__caseMaker!.loadBuiltinBoard('rpi-4b');
    await window.__caseMaker!.patchCase({
      ventilation: { enabled: false, pattern: 'none', coverage: 0 },
    });
  });
  const noVent = await page.evaluate(() => window.__caseMaker!.getMeshStats('shell')!);
  await page.evaluate(async () => {
    await window.__caseMaker!.patchCase({
      ventilation: { enabled: true, pattern: 'slots', coverage: 0.7 },
    });
  });
  const withVent = await page.evaluate(() => window.__caseMaker!.getMeshStats('shell')!);
  // Ventilation cuts holes through the wall — net triangle count grows due to new faces.
  expect(withVent.triangleCount).not.toBe(noVent.triangleCount);
});
