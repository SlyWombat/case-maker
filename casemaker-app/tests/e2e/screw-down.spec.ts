import { test, expect } from './fixtures/caseMaker';

test('screw-down lid: triangle count grows over flat lid (lid holes), shell bosses extend full height', async ({
  cm,
  page,
}) => {
  await cm.ready();
  await page.evaluate(async () => {
    await window.__caseMaker!.loadBuiltinBoard('rpi-4b');
    await window.__caseMaker!.patchCase({ joint: 'flat-lid' });
  });
  const flat = await page.evaluate(() => ({
    lid: window.__caseMaker!.getMeshStats('lid')!,
    shell: window.__caseMaker!.getMeshStats('shell')!,
  }));
  await page.evaluate(async () => {
    await window.__caseMaker!.patchCase({ joint: 'screw-down' });
  });
  const screw = await page.evaluate(() => ({
    lid: window.__caseMaker!.getMeshStats('lid')!,
    shell: window.__caseMaker!.getMeshStats('shell')!,
  }));
  expect(screw.lid.triangleCount).toBeGreaterThan(flat.lid.triangleCount);
  // Bosses now reach into the cavity, so shell triangle count grows too.
  expect(screw.shell.triangleCount).toBeGreaterThan(flat.shell.triangleCount);
});
