import { test, expect } from './fixtures/caseMaker';
import { downloadToBuffer } from './fixtures/parsers';

test('STL ASCII export round-trip: header is "solid", trailer is "endsolid"', async ({
  cm,
  page,
}) => {
  await cm.ready();
  await page.evaluate(async () => {
    await window.__caseMaker!.loadBuiltinBoard('rpi-4b');
  });
  const inAppStats = await page.evaluate(() => window.__caseMaker!.getMeshStats('all')!);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.evaluate(() => window.__caseMaker!.triggerExport('stl-ascii')),
  ]);
  const stream = await download.createReadStream();
  const buf = await downloadToBuffer(stream);
  const text = new TextDecoder('utf-8').decode(buf);
  expect(text.startsWith('solid ')).toBe(true);
  expect(text.trim().endsWith('endsolid casemaker')).toBe(true);
  const facets = (text.match(/facet normal/g) ?? []).length;
  expect(facets).toBe(inAppStats.triangleCount);
});
