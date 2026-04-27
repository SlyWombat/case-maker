import { test, expect } from './fixtures/caseMaker';

test('default port setting is 8000', async ({ cm, page }) => {
  await cm.ready();
  const settings = await page.evaluate(() => window.__caseMaker!.getSettings());
  expect(settings.port).toBe(8000);
  expect(settings.bindToAll).toBe(false);
});

test('setting a port updates the store and the UI', async ({ cm, page }) => {
  await cm.ready();
  await page.evaluate(() => window.__caseMaker!.setPortSetting(9090));
  const after = await page.evaluate(() => window.__caseMaker!.getSettings());
  expect(after.port).toBe(9090);
  await expect(page.getByTestId('settings-port-active')).toHaveText('9090');
  // Reset for hygiene
  await page.evaluate(() => window.__caseMaker!.setPortSetting(8000));
});

test('out-of-range port falls back to default', async ({ cm, page }) => {
  await cm.ready();
  await page.evaluate(() => window.__caseMaker!.setPortSetting(70000));
  const settings = await page.evaluate(() => window.__caseMaker!.getSettings());
  expect(settings.port).toBe(8000);
});
