import { describe, it, expect } from 'vitest';
import { compileProject } from '@/engine/compiler/ProjectCompiler';
import { validateScrewDownAlignment } from '@/engine/compiler/validation';
import { createDefaultProject } from '@/store/projectStore';
import { listBuiltinBoardIds } from '@/library';
import type { BuildOp } from '@/engine/compiler/buildPlan';

function countOps(op: BuildOp, kind: BuildOp['kind']): number {
  let n = op.kind === kind ? 1 : 0;
  if ('child' in op && op.child) n += countOps(op.child, kind);
  if ('children' in op) for (const c of op.children) n += countOps(c, kind);
  return n;
}

describe('Issue #21 — screw-down lid posts + validation', () => {
  it('every built-in board produces no validation errors with default screw-down config', () => {
    for (const id of listBuiltinBoardIds()) {
      const project = createDefaultProject(id);
      project.case.joint = 'screw-down';
      const issues = validateScrewDownAlignment(project);
      const errors = issues.filter((i) => i.severity === 'error');
      expect(errors, `${id}: ${errors.map((e) => e.message).join('; ')}`).toEqual([]);
    }
  });

  it('non-screw-down joints produce no validation issues', () => {
    const project = createDefaultProject('rpi-4b');
    project.case.joint = 'flat-lid';
    expect(validateScrewDownAlignment(project)).toEqual([]);
  });

  it('boss outside the PCB outline produces a board-overlap-boss error', () => {
    const project = createDefaultProject('rpi-4b');
    project.case.joint = 'screw-down';
    project.board = {
      ...project.board,
      mountingHoles: [
        // hole that lands outside the PCB
        { id: 'h-bad', x: 200, y: 200, diameter: 2.7 },
        ...project.board.mountingHoles,
      ],
    };
    const issues = validateScrewDownAlignment(project);
    expect(issues.some((i) => i.code === 'board-overlap-boss')).toBe(true);
  });

  it('a +z component overlapping a boss XY footprint produces a lid-post collision warning', () => {
    const project = createDefaultProject('rpi-4b');
    project.case.joint = 'screw-down';
    const firstHole = project.board.mountingHoles[0]!;
    project.board = {
      ...project.board,
      components: [
        ...project.board.components,
        {
          id: 'tower',
          kind: 'custom',
          position: { x: firstHole.x - 2, y: firstHole.y - 2, z: 1.6 },
          size: { x: 8, y: 8, z: 12 },
          facing: '+z',
        },
      ],
    };
    const issues = validateScrewDownAlignment(project);
    expect(issues.some((i) => i.code === 'lid-post-collides-component')).toBe(true);
  });

  it('screw-down lid mesh has more cylinder ops than a flat lid (posts present)', () => {
    const project = createDefaultProject('rpi-4b');
    project.case.joint = 'flat-lid';
    const flatPlan = compileProject(project);
    const flatLid = flatPlan.nodes.find((n) => n.id === 'lid')!;
    const flatCyls = countOps(flatLid.op, 'cylinder');

    project.case.joint = 'screw-down';
    const sdPlan = compileProject(project);
    const sdLid = sdPlan.nodes.find((n) => n.id === 'lid')!;
    const sdCyls = countOps(sdLid.op, 'cylinder');

    expect(sdCyls).toBeGreaterThan(flatCyls);
  });
});
