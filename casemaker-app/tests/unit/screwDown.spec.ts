import { describe, it, expect } from 'vitest';
import { computeBossPlacements, getScrewClearanceDiameter } from '@/engine/compiler/bosses';
import { computeShellDims } from '@/engine/compiler/caseShell';
import { compileProject } from '@/engine/compiler/ProjectCompiler';
import { createDefaultProject } from '@/store/projectStore';

describe('screw-down geometry', () => {
  it('boss totalHeight stays at floor+standoff regardless of joint (post-#21 design — lid carries posts)', () => {
    const baseProject = createDefaultProject('rpi-4b');
    const flatPlacements = computeBossPlacements(baseProject.board, baseProject.case);
    const screwProject = createDefaultProject('rpi-4b');
    screwProject.case.joint = 'screw-down';
    const screwPlacements = computeBossPlacements(screwProject.board, screwProject.case);
    const expectedHeight =
      screwProject.case.floorThickness + screwProject.board.defaultStandoffHeight;
    expect(screwPlacements[0]!.totalHeight).toBeCloseTo(expectedHeight, 6);
    expect(screwPlacements[0]!.totalHeight).toBeCloseTo(flatPlacements[0]!.totalHeight, 6);
    // shell still sized correctly for the screw-down case
    expect(
      computeShellDims(screwProject.board, screwProject.case).cavityZ,
    ).toBeGreaterThan(0);
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
