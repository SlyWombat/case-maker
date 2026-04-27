import { describe, it, expect } from 'vitest';
import { compileProject } from '@/engine/compiler/ProjectCompiler';
import { createDefaultProject } from '@/store/projectStore';

describe('joint type compilation', () => {
  it('flat-lid produces shell + lid plan with one node each', () => {
    const project = createDefaultProject('rpi-4b');
    project.case.joint = 'flat-lid';
    const plan = compileProject(project);
    expect(plan.nodes.map((n) => n.id)).toEqual(['shell', 'lid']);
  });

  it('snap-fit lid op tree contains a union (top + lip ring) — possibly wrapped if posts present', () => {
    const project = createDefaultProject('rpi-4b');
    project.case.joint = 'snap-fit';
    const plan = compileProject(project);
    const lid = plan.nodes.find((n) => n.id === 'lid')!;
    if (lid.op.kind !== 'translate') throw new Error('expected lid root op to be translate');
    // Child is union (top + lip ring + posts) — no holes when joint != screw-down.
    expect(lid.op.child.kind).toBe('union');
  });

  it('sliding joint adds rails: shell op tree includes union with extra children', () => {
    const flat = compileProject({
      ...createDefaultProject('rpi-4b'),
      case: { ...createDefaultProject('rpi-4b').case, joint: 'flat-lid' },
    });
    const sliding = compileProject({
      ...createDefaultProject('rpi-4b'),
      case: { ...createDefaultProject('rpi-4b').case, joint: 'sliding' },
    });
    const flatShell = flat.nodes.find((n) => n.id === 'shell')!.op;
    const slidingShell = sliding.nodes.find((n) => n.id === 'shell')!.op;
    const countAdditiveChildren = (op: typeof flatShell): number => {
      // Walk through outer difference (cutouts) wrapper if present
      let inner = op;
      if (inner.kind === 'difference') inner = inner.children[0]!;
      return inner.kind === 'union' ? inner.children.length : 1;
    };
    expect(countAdditiveChildren(slidingShell)).toBeGreaterThan(countAdditiveChildren(flatShell));
  });

  it('ventilation enabled adds cutout ops to the shell', () => {
    const off = compileProject(createDefaultProject('rpi-4b'));
    const onProject = createDefaultProject('rpi-4b');
    onProject.case.ventilation = { enabled: true, pattern: 'slots', coverage: 0.6 };
    const on = compileProject(onProject);
    const offShell = off.nodes.find((n) => n.id === 'shell')!.op;
    const onShell = on.nodes.find((n) => n.id === 'shell')!.op;
    // off has no port cutouts (default ports are enabled, so it does), so count differences.
    const countDifferenceChildren = (op: typeof offShell): number =>
      op.kind === 'difference' ? op.children.length : 1;
    expect(countDifferenceChildren(onShell)).toBeGreaterThan(countDifferenceChildren(offShell));
  });
});
