import { describe, it, expect } from 'vitest';
import { buildAsciiStl } from '@/workers/export/stlAscii';
import { parseAsciiStl } from '@/engine/import/stlParser';

const tet = {
  positions: new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10]),
  indices: new Uint32Array([0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3]),
};

describe('ASCII STL writer', () => {
  it('starts with solid and ends with endsolid', () => {
    const text = buildAsciiStl([tet], 'tet');
    expect(text.split('\n')[0]).toBe('solid tet');
    expect(text.trim().endsWith('endsolid tet')).toBe(true);
  });

  it('round-trips through ASCII reader', () => {
    const text = buildAsciiStl([tet], 'tet');
    const parsed = parseAsciiStl(text);
    expect(parsed.triangleCount).toBe(4);
    expect(parsed.bbox.min).toEqual([0, 0, 0]);
    expect(parsed.bbox.max).toEqual([10, 10, 10]);
  });

  it('emits one facet per triangle', () => {
    const text = buildAsciiStl([tet]);
    const facetCount = (text.match(/facet normal/g) ?? []).length;
    expect(facetCount).toBe(4);
  });
});
