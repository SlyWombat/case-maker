import { describe, it, expect } from 'vitest';
import { parseBinaryStl, looksLikeBinaryStl } from '@/engine/import/stlParser';
import { arrayBufferToBase64, base64ToArrayBuffer } from '@/engine/import/base64';
import { buildBinaryStl } from '@/workers/export/stlBinary';

const tet = {
  positions: new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10]),
  indices: new Uint32Array([0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3]),
};

describe('STL import (binary)', () => {
  it('round-trips through writer → parser', () => {
    const buf = buildBinaryStl([tet]);
    expect(looksLikeBinaryStl(buf)).toBe(true);
    const parsed = parseBinaryStl(buf);
    expect(parsed.triangleCount).toBe(4);
    expect(parsed.bbox.min).toEqual([0, 0, 0]);
    expect(parsed.bbox.max).toEqual([10, 10, 10]);
  });

  it('rejects truncated files with a helpful error', () => {
    const buf = new ArrayBuffer(50);
    expect(() => parseBinaryStl(buf)).toThrow(/file too small/i);
  });

  it('base64 round-trip preserves bytes', () => {
    const buf = buildBinaryStl([tet]);
    const b64 = arrayBufferToBase64(buf);
    const back = base64ToArrayBuffer(b64);
    expect(back.byteLength).toBe(buf.byteLength);
    const a = new Uint8Array(buf);
    const b = new Uint8Array(back);
    for (let i = 0; i < a.length; i++) expect(b[i]).toBe(a[i]);
  });
});
