import { describe, it, expect } from 'vitest';
import { parseAsciiStl, parseStl, looksLikeAsciiStl } from '@/engine/import/stlParser';
import { buildBinaryStl } from '@/workers/export/stlBinary';

const ASCII = `solid tet
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 10 0 0
    vertex 0 10 0
  endloop
endfacet
facet normal 0 1 0
  outer loop
    vertex 0 0 0
    vertex 10 0 0
    vertex 0 0 10
  endloop
endfacet
facet normal 1 0 0
  outer loop
    vertex 0 0 0
    vertex 0 0 10
    vertex 0 10 0
  endloop
endfacet
facet normal 1 1 1
  outer loop
    vertex 10 0 0
    vertex 0 10 0
    vertex 0 0 10
  endloop
endfacet
endsolid tet
`;

describe('ASCII STL parser', () => {
  it('parses 4 triangles from a tetrahedron', () => {
    const parsed = parseAsciiStl(ASCII);
    expect(parsed.triangleCount).toBe(4);
    expect(parsed.bbox.min).toEqual([0, 0, 0]);
    expect(parsed.bbox.max).toEqual([10, 10, 10]);
  });

  it('detects ASCII format from buffer', () => {
    const buf = new TextEncoder().encode(ASCII).buffer as ArrayBuffer;
    expect(looksLikeAsciiStl(buf)).toBe(true);
  });

  it('parseStl auto-routes to ASCII parser', () => {
    const buf = new TextEncoder().encode(ASCII).buffer as ArrayBuffer;
    const parsed = parseStl(buf);
    expect(parsed.triangleCount).toBe(4);
  });

  it('parseStl auto-routes to binary parser', () => {
    const tet = {
      positions: new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10]),
      indices: new Uint32Array([0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3]),
    };
    const buf = buildBinaryStl([tet]);
    const parsed = parseStl(buf);
    expect(parsed.triangleCount).toBe(4);
  });

  it('throws when triangle count is malformed', () => {
    expect(() => parseAsciiStl('solid x\nvertex 1 2 3\nendsolid')).toThrow();
  });
});
