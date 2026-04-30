import { describe, it, expect } from 'vitest';
import {
  buildMountingFeatureOps,
  endFlangesPreset,
} from '@/engine/compiler/mountingFeatures';
import { computeShellDims } from '@/engine/compiler/caseShell';
import { createDefaultProject } from '@/store/projectStore';
import type { BuildOp } from '@/engine/compiler/buildPlan';

function bboxOf(op: BuildOp): { min: [number, number, number]; max: [number, number, number] } {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  function expand(x: number, y: number, z: number): void {
    if (x < min[0]) min[0] = x;
    if (y < min[1]) min[1] = y;
    if (z < min[2]) min[2] = z;
    if (x > max[0]) max[0] = x;
    if (y > max[1]) max[1] = y;
    if (z > max[2]) max[2] = z;
  }
  function walk(o: BuildOp, ox: number, oy: number, oz: number): void {
    if (o.kind === 'translate') {
      walk(o.child, ox + o.offset[0], oy + o.offset[1], oz + o.offset[2]);
    } else if (o.kind === 'rotate' || o.kind === 'scale') {
      walk(o.child, ox, oy, oz);
    } else if (o.kind === 'cube') {
      const [sx, sy, sz] = o.size;
      const x0 = o.center ? ox - sx / 2 : ox;
      const y0 = o.center ? oy - sy / 2 : oy;
      const z0 = o.center ? oz - sz / 2 : oz;
      expand(x0, y0, z0);
      expand(x0 + sx, y0 + sy, z0 + sz);
    } else if (o.kind === 'cylinder') {
      const r = o.radiusLow;
      expand(ox - r, oy - r, oz);
      expand(ox + r, oy + r, oz + o.height);
    }
    if ('children' in o) for (const c of o.children) walk(c, ox, oy, oz);
  }
  walk(op, 0, 0, 0);
  return { min, max };
}

describe('end-flange geometry (#80, slice 3)', () => {
  it('endFlangesPreset emits 4 features (2 per wall on ±y by default)', () => {
    const features = endFlangesPreset(100, 70, 30);
    expect(features).toHaveLength(4);
    const walls = features.map((f) => f.face).sort();
    expect(walls).toEqual(['+y', '+y', '-y', '-y']);
    for (const f of features) {
      expect(f.type).toBe('end-flange');
      expect(f.mountClass).toBe('external');
    }
  });

  it('compiled additive bbox grows OUTWARD past the case envelope on the chosen wall', () => {
    const project = createDefaultProject('rpi-4b');
    const dims = computeShellDims(project.board, project.case);
    const features = endFlangesPreset(dims.outerX, dims.outerY, dims.outerZ);
    const ops = buildMountingFeatureOps(features, project.board, project.case);
    expect(ops.additive.length).toBeGreaterThanOrEqual(features.length);
    let anyPastY = false;
    let anyNegY = false;
    for (const op of ops.additive) {
      const bb = bboxOf(op);
      if (bb.max[1] > dims.outerY + 1) anyPastY = true;
      if (bb.min[1] < -1) anyNegY = true;
    }
    expect(anyPastY, 'at least one +y flange should extend in +Y past outerY').toBe(true);
    expect(anyNegY, 'at least one -y flange should extend in -Y past origin').toBe(true);
  });

  it('every flange produces additive plate + cap + rib gusset and a subtractive bolt hole', () => {
    const project = createDefaultProject('rpi-4b');
    const dims = computeShellDims(project.board, project.case);
    const features = endFlangesPreset(dims.outerX, dims.outerY, dims.outerZ);
    const ops = buildMountingFeatureOps(features, project.board, project.case);
    // Each flange = rect + cap + rib (3 additive ops) + 1 hole = 3 add, 1 sub.
    expect(ops.additive.length).toBe(features.length * 3);
    expect(ops.subtractive.length).toBe(features.length);
  });

  it('disabling the rib drops the rib op (params.ribEnabled = 0) — back to rect+cap only', () => {
    const project = createDefaultProject('rpi-4b');
    const dims = computeShellDims(project.board, project.case);
    const features = endFlangesPreset(dims.outerX, dims.outerY, dims.outerZ).map((f) => ({
      ...f,
      params: { ...f.params, ribEnabled: 0 },
    }));
    const ops = buildMountingFeatureOps(features, project.board, project.case);
    expect(ops.additive.length).toBe(features.length * 2);
  });

  it('disabling all flanges produces zero additive / subtractive ops', () => {
    const project = createDefaultProject('rpi-4b');
    const dims = computeShellDims(project.board, project.case);
    const features = endFlangesPreset(dims.outerX, dims.outerY, dims.outerZ).map((f) => ({
      ...f,
      enabled: false,
    }));
    const ops = buildMountingFeatureOps(features, project.board, project.case);
    expect(ops.additive).toEqual([]);
    expect(ops.subtractive).toEqual([]);
  });

  it('end-flange on a ±z face is a no-op (vertical fin not supported here)', () => {
    const project = createDefaultProject('rpi-4b');
    const ops = buildMountingFeatureOps(
      [
        {
          id: 'top-flange',
          type: 'end-flange',
          mountClass: 'external',
          face: '+z',
          position: { u: 50, v: 30 },
          rotation: 0,
          params: { projection: 12, width: 12, thickness: 3, holeDiameter: 3.4 },
          enabled: true,
        },
      ],
      project.board,
      project.case,
    );
    expect(ops.additive).toEqual([]);
    expect(ops.subtractive).toEqual([]);
  });
});
