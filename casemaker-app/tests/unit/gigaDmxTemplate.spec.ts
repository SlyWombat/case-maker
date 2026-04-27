import { describe, it, expect } from 'vitest';
import { findTemplate } from '@/library/templates';
import { compileProject } from '@/engine/compiler/ProjectCompiler';
import { computeShellDims } from '@/engine/compiler/caseShell';
import { getBuiltinHat } from '@/library/hats';
import type { BuildOp } from '@/engine/compiler/buildPlan';

function countOps(op: BuildOp, kind: BuildOp['kind']): number {
  let n = op.kind === kind ? 1 : 0;
  if ('child' in op && op.child) n += countOps(op.child, kind);
  if ('children' in op) for (const c of op.children) n += countOps(c, kind);
  return n;
}

describe('Issue #32 — GIGA + DMX template + side-Z stack height', () => {
  it('giga-dmx-controller template builds without error', () => {
    const tpl = findTemplate('giga-dmx-controller')!;
    const project = tpl.build();
    expect(project.board.id).toBe('arduino-giga-r1-wifi');
    expect(project.hats.length).toBe(1);
    expect(project.hats[0]!.hatId).toBe('cqrobot-dmx-shield-max485');
  });

  it('case envelope for GIGA + DMX is at least 45 mm tall (XLR z-extent included)', () => {
    const tpl = findTemplate('giga-dmx-controller')!;
    const project = tpl.build();
    const dims = computeShellDims(
      project.board,
      project.case,
      project.hats,
      (id) => getBuiltinHat(id),
    );
    expect(dims.outerZ).toBeGreaterThanOrEqual(45);
  });

  it('compiled GIGA + DMX shell has at least 2 cylinder cutouts (XLR connectors)', () => {
    const tpl = findTemplate('giga-dmx-controller')!;
    const project = tpl.build();
    const plan = compileProject(project);
    const shell = plan.nodes.find((n) => n.id === 'shell')!;
    const cyls = countOps(shell.op, 'cylinder');
    expect(cyls).toBeGreaterThanOrEqual(2);
  });
});
