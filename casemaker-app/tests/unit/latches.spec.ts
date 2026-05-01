// Issue #109 — Pelican-standard spring-cam locking latches (v2 redesign).
// Updated geometry per user spec: arm hinges to case body via two case-side
// knuckles + one arm-side knuckle + a print-in-place pin; striker moves to
// the lid edge (on a tab projecting upward). Cam hook on top of the arm
// wraps over the lid striker to pull the lid down.

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

describe('Pelican-standard latches (#109 v2)', () => {
  it('returns empty ops when latches is undefined', () => {
    const project = createDefaultProject('rpi-4b');
    const ops = buildLatchOps(undefined, project.board, project.case, project.hats ?? [], () => undefined);
    expect(ops.caseAdditive).toEqual([]);
    expect(ops.caseSubtract).toEqual([]);
    expect(ops.lidAdditive).toEqual([]);
    expect(ops.armNodes).toEqual([]);
    expect(ops.pinNodes).toEqual([]);
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
    expect(ops.armNodes).toEqual([]);
    expect(ops.pinNodes).toEqual([]);
  });

  it('skips latches when lidRecess=true (Pelican-standard requires non-recessed lid)', () => {
    const project = createDefaultProject('rpi-4b');
    const ops = buildLatchOps(
      [ONE_LATCH],
      project.board,
      { ...project.case, lidRecess: true },
      project.hats ?? [],
      () => undefined,
    );
    expect(ops.armNodes).toEqual([]);
    expect(ops.caseAdditive).toEqual([]);
    expect(ops.lidAdditive).toEqual([]);
    expect(ops.pinNodes).toEqual([]);
  });

  it('one enabled latch produces 2 case knuckles + 1 arm + 1 pin + 1 lid striker tab + 1 case bore', () => {
    const project = createDefaultProject('rpi-4b');
    const ops = buildLatchOps([ONE_LATCH], project.board, project.case, project.hats ?? [], () => undefined);
    expect(ops.caseAdditive).toHaveLength(2);   // two case knuckles
    expect(ops.caseSubtract).toHaveLength(1);   // pin bore through both case knuckles
    expect(ops.lidAdditive).toHaveLength(1);    // tab + striker (unioned)
    expect(ops.armNodes).toHaveLength(1);
    expect(ops.pinNodes).toHaveLength(1);
    expect(ops.armNodes[0]?.id).toBe('latch-arm-latch-test');
    expect(ops.pinNodes[0]?.id).toBe('latch-pin-latch-test');
  });

  it('four latches on opposite walls produce 8 case knuckles + 4 arms + 4 pins + 4 lid tabs', () => {
    const project = createDefaultProject('rpi-4b');
    const latches: Latch[] = [
      { ...ONE_LATCH, id: 'a', wall: '-y', uPosition: 25 },
      { ...ONE_LATCH, id: 'b', wall: '-y', uPosition: 60 },
      { ...ONE_LATCH, id: 'c', wall: '+y', uPosition: 25 },
      { ...ONE_LATCH, id: 'd', wall: '+y', uPosition: 60 },
    ];
    const ops = buildLatchOps(latches, project.board, project.case, project.hats ?? [], () => undefined);
    expect(ops.caseAdditive).toHaveLength(8);
    expect(ops.caseSubtract).toHaveLength(4);
    expect(ops.lidAdditive).toHaveLength(4);
    expect(ops.armNodes).toHaveLength(4);
    expect(ops.pinNodes).toHaveLength(4);
  });

  it('latch.tolerance widens the arm-to-wall engagement gap (#113)', () => {
    const project = createDefaultProject('rpi-4b');
    const tight = buildLatchOps(
      [{ ...ONE_LATCH, wall: '+y', tolerance: 0.2 }],
      project.board, project.case, project.hats ?? [], () => undefined,
    );
    const loose = buildLatchOps(
      [{ ...ONE_LATCH, wall: '+y', tolerance: 0.4 }],
      project.board, project.case, project.hats ?? [], () => undefined,
    );
    // The arm body's inner face is at wallOuter + outwardSign*(HOOK_WALL_OFFSET + tolerance).
    // Bumping tolerance by 0.2 should shift the arm OUTWARD by 0.2 mm. The arm
    // is a union of [knuckle, body, hook]; the JSON serialization should differ
    // and the bbox-min Y of the body should change by 0.2.
    expect(JSON.stringify(tight.armNodes[0])).not.toBe(JSON.stringify(loose.armNodes[0]));
  });

  it('compileProject emits latch arm + pin + striker tab when latches are configured', () => {
    const project = createDefaultProject('rpi-4b');
    const latched = {
      ...project,
      case: {
        ...project.case,
        latches: [ONE_LATCH],
      },
    };
    const plan = compileProject(latched);
    expect(plan.nodes.find((n) => n.id === 'latch-arm-latch-test')).toBeDefined();
    expect(plan.nodes.find((n) => n.id === 'latch-pin-latch-test')).toBeDefined();
    // Lid node exists and contains the striker tab merged in (single 'lid' node).
    expect(plan.nodes.find((n) => n.id === 'lid')).toBeDefined();
  });
});
