import { describe, it, expect } from 'vitest';
import { parse3MF } from '@/engine/import/threeMfParser';
import { buildThreeMf } from '@/workers/export/threeMf';

const tet = {
  positions: new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10]),
  indices: new Uint32Array([0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3]),
};

describe('3MF import', () => {
  it('round-trips through writer → parser', () => {
    const buf = buildThreeMf([tet]);
    const parsed = parse3MF(buf);
    expect(parsed.triangleCount).toBe(4);
    expect(parsed.bbox.min).toEqual([0, 0, 0]);
    expect(parsed.bbox.max).toEqual([10, 10, 10]);
  });

  it('handles multi-object 3MF by concatenating geometry', () => {
    const buf = buildThreeMf([tet, tet]);
    const parsed = parse3MF(buf);
    expect(parsed.triangleCount).toBe(8);
  });

  it('throws on a zip without 3D/3dmodel.model', () => {
    expect(() => parse3MF(new ArrayBuffer(64))).toThrow();
  });
});
