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
    } else if (o.kind === 'mesh') {
      for (let i = 0; i < o.positions.length; i += 3) {
        expand(ox + o.positions[i]!, oy + o.positions[i + 1]!, oz + o.positions[i + 2]!);
      }
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

  it('every flange produces additive plate + cap + two side ribs and a subtractive bolt hole (#102)', () => {
    const project = createDefaultProject('rpi-4b');
    const dims = computeShellDims(project.board, project.case);
    const features = endFlangesPreset(dims.outerX, dims.outerY, dims.outerZ);
    const ops = buildMountingFeatureOps(features, project.board, project.case);
    // #102 — ribs split to TWO per flange so the screw bore stays clear:
    //   rect + cap + rib_left + rib_right (4 additive ops) + 1 hole.
    expect(ops.additive.length).toBe(features.length * 4);
    expect(ops.subtractive.length).toBe(features.length);
  });

  it('disabling the rib drops both rib ops (params.ribEnabled = 0) — back to rect+cap only', () => {
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

  it('flange plate underside is flush with the case bottom (z=0) on every wall (#101)', () => {
    const project = createDefaultProject('rpi-4b');
    const dims = computeShellDims(project.board, project.case);
    // Test on every side wall; thickness 3 → underside at z=0, top at z=3.
    const walls: ('+x' | '-x' | '+y' | '-y')[] = ['+x', '-x', '+y', '-y'];
    for (const wall of walls) {
      const features = endFlangesPreset(dims.outerX, dims.outerY, dims.outerZ, [wall]);
      const ops = buildMountingFeatureOps(features, project.board, project.case);
      // Plate (rect) is the FIRST additive op per flange in current order.
      // Across all the additive ops, the global Z-min should be 0 (underside
      // at the case bottom) and the Z-max should be at most flange thickness
      // + rib height (rib sits on top of plate).
      let zMin = Infinity;
      for (const op of ops.additive) {
        const bb = bboxOf(op);
        if (bb.min[2] < zMin) zMin = bb.min[2];
      }
      expect(zMin, `wall ${wall}: flange underside should be at z=0`).toBeCloseTo(0, 3);
    }
  });

  it('rib gussets do not occupy the screw clearance footprint (#102)', () => {
    const project = createDefaultProject('rpi-4b');
    const dims = computeShellDims(project.board, project.case);
    const features = endFlangesPreset(dims.outerX, dims.outerY, dims.outerZ);
    const ops = buildMountingFeatureOps(features, project.board, project.case);
    // For each subtractive bolt-hole cylinder, find the world (x,y) center
    // and verify no additive RIB MESH op overlaps that center in XY.
    // (The plate cube and cap cylinder do overlap the bore — they're meant
    // to; the bore subtracts from them. Ribs are meshes.)
    const ribOps = ops.additive.filter((o) => {
      // Walk to find a mesh — ribs are the only mesh ops in flange output.
      function hasMesh(op: BuildOp): boolean {
        if (op.kind === 'mesh') return true;
        if ('child' in op && op.child) return hasMesh(op.child);
        if ('children' in op) return op.children.some(hasMesh);
        return false;
      }
      return hasMesh(o);
    });
    expect(ribOps.length, 'should have rib mesh ops to test').toBeGreaterThan(0);

    // Each subtractive op is a translate(cylinder); the cylinder is centered
    // on the bolt hole. Read its translated XY center.
    for (const sub of ops.subtractive) {
      let cx = 0;
      let cy = 0;
      let op: BuildOp = sub;
      while (op.kind === 'translate') {
        cx += op.offset[0];
        cy += op.offset[1];
        op = op.child;
      }
      // Find the cylinder so we know the bore radius.
      let bore = op;
      while (bore.kind === 'translate' || bore.kind === 'rotate') bore = bore.child;
      const r = bore.kind === 'cylinder' ? bore.radiusLow : 1.7;

      // For each rib mesh, every triangle vertex (x, y) must be at least
      // (r) away from (cx, cy). I.e. the rib XY footprint clears the bore.
      for (const ribOp of ribOps) {
        const bb = bboxOf(ribOp);
        // Quick reject: bbox doesn't touch the bore-XY-square. If the bbox
        // is fully outside the [cx±r, cy±r] square, the rib clears it.
        const ribMinX = bb.min[0];
        const ribMaxX = bb.max[0];
        const ribMinY = bb.min[1];
        const ribMaxY = bb.max[1];
        // Two ribs per flange, only one pair belongs to this hole. Skip
        // ribs that aren't anywhere near this bolt position (bbox in XY
        // far from the bore center in BOTH axes).
        const xyDistApprox = Math.hypot(
          Math.max(ribMinX - cx, cx - ribMaxX, 0),
          Math.max(ribMinY - cy, cy - ribMaxY, 0),
        );
        if (xyDistApprox > 30) continue; // not this flange's rib

        // For the matching ribs: assert XY bbox does not contain (cx, cy).
        const insideX = ribMinX - 0.001 <= cx && cx <= ribMaxX + 0.001;
        const insideY = ribMinY - 0.001 <= cy && cy <= ribMaxY + 0.001;
        expect(
          insideX && insideY,
          `rib bbox [${ribMinX.toFixed(2)},${ribMaxX.toFixed(2)}]×[${ribMinY.toFixed(2)},${ribMaxY.toFixed(2)}] contains bore center (${cx.toFixed(2)}, ${cy.toFixed(2)}); rib crosses screw hole`,
        ).toBe(false);
        void r;
      }
    }
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
