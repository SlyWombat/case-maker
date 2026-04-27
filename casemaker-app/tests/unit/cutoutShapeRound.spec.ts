import { describe, it, expect } from 'vitest';
import { buildAxisAlignedCutout } from '@/engine/compiler/roundCutout';
import { buildPortCutoutOp } from '@/engine/compiler/ports';
import { createDefaultProject } from '@/store/projectStore';
import type { BuildOp } from '@/engine/compiler/buildPlan';

function findFirstShape(op: BuildOp, kind: 'cube' | 'cylinder'): BuildOp | null {
  if (op.kind === kind) return op;
  if ('child' in op && op.child) return findFirstShape(op.child, kind);
  if ('children' in op) {
    for (const c of op.children) {
      const r = findFirstShape(c, kind);
      if (r) return r;
    }
  }
  return null;
}

describe('Issue #18 — round cutout op support', () => {
  it('rect shape produces a translated cube op (back-compat default)', () => {
    const op = buildAxisAlignedCutout('+y', 0, 0, 0, 10, 5, 8, 'rect');
    expect(findFirstShape(op, 'cube')).toBeTruthy();
    expect(findFirstShape(op, 'cylinder')).toBeNull();
  });

  it('round shape on +y produces a cylinder rotated about X', () => {
    const op = buildAxisAlignedCutout('+y', 0, 0, 0, 22, 5, 22, 'round');
    const cyl = findFirstShape(op, 'cylinder');
    expect(cyl).toBeTruthy();
    if (cyl && cyl.kind === 'cylinder') {
      expect(cyl.height).toBe(5);
      expect(cyl.radiusLow).toBe(11);
    }
  });

  it('round shape on -y produces a cylinder', () => {
    const op = buildAxisAlignedCutout('-y', 0, 0, 0, 22, 5, 22, 'round');
    expect(findFirstShape(op, 'cylinder')).toBeTruthy();
  });

  it('round shape on +x produces a cylinder rotated about Y', () => {
    const op = buildAxisAlignedCutout('+x', 0, 0, 0, 5, 20, 20, 'round');
    const cyl = findFirstShape(op, 'cylinder');
    expect(cyl).toBeTruthy();
    if (cyl && cyl.kind === 'cylinder') {
      expect(cyl.height).toBe(5);
      expect(cyl.radiusLow).toBe(10);
    }
  });

  it('round shape on -x produces a cylinder', () => {
    const op = buildAxisAlignedCutout('-x', 0, 0, 0, 5, 20, 20, 'round');
    expect(findFirstShape(op, 'cylinder')).toBeTruthy();
  });

  it('+z facing falls back to a cube even when shape is round', () => {
    const op = buildAxisAlignedCutout('+z', 0, 0, 0, 10, 10, 5, 'round');
    expect(findFirstShape(op, 'cube')).toBeTruthy();
    expect(findFirstShape(op, 'cylinder')).toBeNull();
  });

  it('PortPlacement.cutoutShape="round" propagates through buildPortCutoutOp', () => {
    const project = createDefaultProject('rpi-4b');
    const port = { ...project.ports[0]!, cutoutShape: 'round' as const };
    const op = buildPortCutoutOp(port, project.board, project.case);
    expect(op).not.toBeNull();
    expect(findFirstShape(op!, 'cylinder')).toBeTruthy();
  });
});
