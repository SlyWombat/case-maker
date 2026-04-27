import { describe, it, expect } from 'vitest';
import { computeBossPlacements, getScrewClearanceDiameter } from '@/engine/compiler/bosses';
import { computeShellDims } from '@/engine/compiler/caseShell';
import { compileProject } from '@/engine/compiler/ProjectCompiler';
import { createDefaultProject } from '@/store/projectStore';

describe('screw-down geometry', () => {
  it('boss totalHeight grows to floor + cavityZ when joint=screw-down', () => {
    const baseProject = createDefaultProject('rpi-4b');
    const flatPlacements = computeBossPlacements(baseProject.board, baseProject.case);
    const screwProject = createDefaultProject('rpi-4b');
    screwProject.case.joint = 'screw-down';
    const screwPlacements = computeBossPlacements(screwProject.board, screwProject.case);
    const expectedHeight =
      screwProject.case.floorThickness +
      computeShellDims(screwProject.board, screwProject.case).cavityZ;
    expect(screwPlacements[0]!.totalHeight).toBeCloseTo(expectedHeight, 6);
    expect(screwPlacements[0]!.totalHeight).toBeGreaterThan(flatPlacements[0]!.totalHeight);
  });

  it('lid gets corner holes when screw-down (compiler tree includes difference)', () => {
    const project = createDefaultProject('rpi-4b');
    project.case.joint = 'screw-down';
    const plan = compileProject(project);
    const lidNode = plan.nodes.find((n) => n.id === 'lid')!;
    let cur = lidNode.op;
    while (cur.kind === 'translate' || cur.kind === 'rotate' || cur.kind === 'scale') {
      cur = cur.child;
    }
    expect(cur.kind).toBe('difference');
  });

  it('flat-lid does NOT include lid holes (difference)', () => {
    const project = createDefaultProject('rpi-4b');
    project.case.joint = 'flat-lid';
    const plan = compileProject(project);
    const lidNode = plan.nodes.find((n) => n.id === 'lid')!;
    let cur = lidNode.op;
    while (cur.kind === 'translate' || cur.kind === 'rotate' || cur.kind === 'scale') {
      cur = cur.child;
    }
    expect(cur.kind).toBe('cube');
  });

  it('screw clearance diameter matches the insert variant', () => {
    expect(getScrewClearanceDiameter('heat-set-m3')).toBeGreaterThan(
      getScrewClearanceDiameter('self-tap'),
    );
  });
});
