import { test, expect } from './fixtures/caseMaker';

test('selecting a port via API updates viewportStore.selectedPortId', async ({ cm, page }) => {
  await cm.ready();
  await page.evaluate(async () => {
    await window.__caseMaker!.loadBuiltinBoard('rpi-4b');
  });
  const portId = await page.evaluate(() => window.__caseMaker!.getProject().ports[0]!.id);
  await page.evaluate((id) => window.__caseMaker!.selectPort(id), portId);
  const selected = await page.evaluate(() => window.__caseMaker!.getSelectedPortId());
  expect(selected).toBe(portId);
});

test('patchPort updates the port position and triggers a rebuild', async ({ cm, page }) => {
  await cm.ready();
  await page.evaluate(async () => {
    await window.__caseMaker!.loadBuiltinBoard('rpi-4b');
  });
  const before = await page.evaluate(() => window.__caseMaker!.getMeshStats('shell')!);
  const portId = await page.evaluate(() => window.__caseMaker!.getProject().ports[0]!.id);
  await page.evaluate(async (id) => {
    await window.__caseMaker!.patchPort(id, { position: { z: 4 } });
  }, portId);
  const updated = await page.evaluate(
    (id) => window.__caseMaker!.getProject().ports.find((p) => p.id === id)?.position,
    portId,
  );
  expect(updated?.z).toBe(4);
  const after = await page.evaluate(() => window.__caseMaker!.getMeshStats('shell')!);
  expect(after.triangleCount).not.toBe(before.triangleCount);
});
