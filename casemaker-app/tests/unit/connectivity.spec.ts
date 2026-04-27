import { describe, it, expect } from 'vitest';
import { compileProject } from '@/engine/compiler/ProjectCompiler';
import {
  bboxOfOp,
  checkBuildPlanShape,
} from '@/engine/compiler/connectivity';
import { createDefaultProject } from '@/store/projectStore';
import { listBuiltinBoardIds } from '@/library';
import { cube, cylinder, translate, union } from '@/engine/compiler/buildPlan';

describe('Issue #26 — connectivity / build-plan shape gate', () => {
  it('every default-config Project for every built-in board produces a shell + lid plan', () => {
    for (const id of listBuiltinBoardIds()) {
      const project = createDefaultProject(id);
      const plan = compileProject(project);
      const issues = checkBuildPlanShape(plan);
      expect(issues, `${id}: ${issues.join('; ')}`).toEqual([]);
    }
  });

  it('bboxOfOp(cube) at origin returns expected min/max', () => {
    const op = cube([10, 5, 2]);
    const bbox = bboxOfOp(op);
    expect(bbox).toEqual({ min: [0, 0, 0], max: [10, 5, 2] });
  });

  it('bboxOfOp(translate(cube)) shifts min/max by offset', () => {
    const op = translate([5, 5, 5], cube([10, 10, 10]));
    const bbox = bboxOfOp(op);
    expect(bbox).toEqual({ min: [5, 5, 5], max: [15, 15, 15] });
  });

  it('bboxOfOp(union of two disjoint cubes) returns the merged envelope', () => {
    const op = union([
      cube([5, 5, 5]),
      translate([100, 0, 0], cube([5, 5, 5])),
    ]);
    const bbox = bboxOfOp(op);
    expect(bbox).toEqual({ min: [0, 0, 0], max: [105, 5, 5] });
  });

  it('bboxOfOp(cylinder) approximates with diameter as bounding XY', () => {
    const op = cylinder(10, 3);
    const bbox = bboxOfOp(op);
    expect(bbox).toEqual({ min: [-3, -3, 0], max: [3, 3, 10] });
  });
});
