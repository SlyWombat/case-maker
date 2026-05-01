// Issue #109 — Pelican-style spring-cam locking latches. v1 geometry:
// striker on the case wall, cam arm as a separate top-level BuildNode.

import { describe, it, expect } from 'vitest';
import { buildLatchOps } from '@/engine/compiler/latches';
import { compileProject } from '@/engine/compiler/ProjectCompiler';
import { createDefaultProject } from '@/store/projectStore';
import type { Latch } from '@/types';
import { LATCH_DEFAULTS } from '@/types/latch';

const ONE_LATCH: Latch = {
  id: 'latch-test',
  wall: '-y',
  uPosition: 30,
  enabled: true,
  throw: LATCH_DEFAULTS.throw,
  width: LATCH_DEFAULTS.width,
  height: LATCH_DEFAULTS.height,
};

describe('Spring-cam latches (#109)', () => {
  it('returns empty ops when latches is undefined', () => {
    const project = createDefaultProject('rpi-4b');
    const ops = buildLatchOps(undefined, project.board, project.case, project.hats ?? [], () => undefined);
    expect(ops.caseAdditive).toEqual([]);
    expect(ops.armNodes).toEqual([]);
  });

  it('returns empty ops when all latches are disabled', () => {
    const project = createDefaultProject('rpi-4b');
    const ops = buildLatchOps(
      [{ ...ONE_LATCH, enabled: false }],
      project.board,
      project.case,
      project.hats ?? [],
      () => undefined,
    );
    expect(ops.caseAdditive).toEqual([]);
    expect(ops.armNodes).toEqual([]);
  });

  it('one enabled latch produces 1 striker + 1 arm node', () => {
    const project = createDefaultProject('rpi-4b');
    const ops = buildLatchOps([ONE_LATCH], project.board, project.case, project.hats ?? [], () => undefined);
    expect(ops.caseAdditive).toHaveLength(1);
    expect(ops.armNodes).toHaveLength(1);
    expect(ops.armNodes[0]?.id).toBe('latch-arm-latch-test');
  });

  it('four latches on opposite walls produce 4 strikers + 4 arm nodes', () => {
    const project = createDefaultProject('rpi-4b');
    const latches: Latch[] = [
      { ...ONE_LATCH, id: 'a', wall: '-y', uPosition: 25 },
      { ...ONE_LATCH, id: 'b', wall: '-y', uPosition: 60 },
      { ...ONE_LATCH, id: 'c', wall: '+y', uPosition: 25 },
      { ...ONE_LATCH, id: 'd', wall: '+y', uPosition: 60 },
    ];
    const ops = buildLatchOps(latches, project.board, project.case, project.hats ?? [], () => undefined);
    expect(ops.caseAdditive).toHaveLength(4);
    expect(ops.armNodes).toHaveLength(4);
  });

  // ---------------------------------------------------------------------------
  // Issue #113 — per-printer cam/striker engagement tolerance.
  // Pre-#113 the arm sat 1.5 mm OUT from the wall outer face (hardcoded
  // armOuterDistance). The new optional `latch.tolerance` shifts this gap;
  // default 0.2 reproduces the original 1.5 mm gap (1.3 + 0.2). When the
  // field is unset, geometry MUST be byte-identical to the pre-#113 build.
  // ---------------------------------------------------------------------------
  it('tolerance defaults preserve pre-#113 geometry exactly (#113)', () => {
    const project = createDefaultProject('rpi-4b');
    const dflt = buildLatchOps([{ ...ONE_LATCH, wall: '+y' }], project.board, project.case, project.hats ?? [], () => undefined);
    const explicit = buildLatchOps(
      [{ ...ONE_LATCH, wall: '+y', tolerance: 0.2 }],
      project.board,
      project.case,
      project.hats ?? [],
      () => undefined,
    );
    expect(JSON.stringify(dflt.armNodes[0])).toBe(JSON.stringify(explicit.armNodes[0]));
    expect(JSON.stringify(dflt.caseAdditive[0])).toBe(JSON.stringify(explicit.caseAdditive[0]));
  });

  it('tolerance widens the wall-to-arm engagement gap proportionally (#113)', () => {
    const project = createDefaultProject('rpi-4b');
    const tight = buildLatchOps(
      [{ ...ONE_LATCH, wall: '+y', tolerance: 0.2 }],
      project.board,
      project.case,
      project.hats ?? [],
      () => undefined,
    );
    const loose = buildLatchOps(
      [{ ...ONE_LATCH, wall: '+y', tolerance: 0.4 }],
      project.board,
      project.case,
      project.hats ?? [],
      () => undefined,
    );
    // Arm placement for '+y' wall is translate([_, dims.outerY + armOuterDistance, rimTopZ], ...).
    // Bumping tolerance from 0.2 → 0.4 should push the Y offset OUT by exactly 0.2 mm.
    const tightArm = tight.armNodes[0]!.op;
    const looseArm = loose.armNodes[0]!.op;
    if (tightArm.kind !== 'translate' || looseArm.kind !== 'translate') {
      throw new Error('expected top-level translate on arm');
    }
    expect(looseArm.offset[1] - tightArm.offset[1]).toBeCloseTo(0.2, 6);
  });

  it('compileProject emits latch arm BuildNodes when latches are configured', () => {
    const project = createDefaultProject('rpi-4b');
    const sealedLatched = {
      ...project,
      case: {
        ...project.case,
        latches: [ONE_LATCH],
      },
    };
    const plan = compileProject(sealedLatched);
    expect(plan.nodes.find((n) => n.id === 'latch-arm-latch-test')).toBeDefined();
  });
});
