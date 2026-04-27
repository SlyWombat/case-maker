import { test, expect } from './fixtures/caseMaker';

test('project save/load round-trip: serialize, mutate, reload, mesh stats restored', async ({
  cm,
  page,
}) => {
  await cm.ready();
  await page.evaluate(async () => {
    await window.__caseMaker!.loadBuiltinBoard('rpi-4b');
    await window.__caseMaker!.patchCase({ wallThickness: 3, joint: 'snap-fit' });
  });
  const beforeStats = await page.evaluate(() => ({
    shell: window.__caseMaker!.getMeshStats('shell')!,
    lid: window.__caseMaker!.getMeshStats('lid')!,
    serialized: window.__caseMaker!.serializeProject(),
  }));

  // Mutate to a different state to prove load actually restores
  await page.evaluate(async () => {
    await window.__caseMaker!.patchCase({ wallThickness: 1, joint: 'flat-lid' });
  });

  await page.evaluate(async (json) => {
    await window.__caseMaker!.loadSerializedProject(json);
  }, beforeStats.serialized);

  const afterStats = await page.evaluate(() => ({
    shell: window.__caseMaker!.getMeshStats('shell')!,
    lid: window.__caseMaker!.getMeshStats('lid')!,
  }));
  expect(afterStats.shell.triangleCount).toBe(beforeStats.shell.triangleCount);
  expect(afterStats.lid.triangleCount).toBe(beforeStats.lid.triangleCount);
});
