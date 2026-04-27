import { test, expect } from './fixtures/caseMaker';
import { downloadToBuffer, parseBinaryStl } from './fixtures/parsers';

test('print-ready export drops bbox.min to (0,0,0)', async ({ cm, page }) => {
  await cm.ready();
  await page.evaluate(async () => {
    await window.__caseMaker!.loadBuiltinBoard('rpi-4b');
  });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.evaluate(() => window.__caseMaker!.triggerExport('stl-binary')),
  ]);
  const buf = await downloadToBuffer(await download.createReadStream());
  const parsed = parseBinaryStl(buf);
  expect(parsed.bbox.min[0]).toBeCloseTo(0, 1);
  expect(parsed.bbox.min[1]).toBeCloseTo(0, 1);
  expect(parsed.bbox.min[2]).toBeCloseTo(0, 1);
});
