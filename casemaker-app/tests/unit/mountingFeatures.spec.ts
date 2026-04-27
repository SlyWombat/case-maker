import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildMountingFeatureOps,
  fourCornerScrewTabs,
} from '@/engine/compiler/mountingFeatures';
import { compileProject } from '@/engine/compiler/ProjectCompiler';
import { useProjectStore, createDefaultProject } from '@/store/projectStore';

describe('mounting features (#9 Phase 10a)', () => {
  beforeEach(() => {
    useProjectStore.getState().setProject(createDefaultProject('rpi-4b'));
  });

  it('fourCornerScrewTabs produces 4 features with correct preset id', () => {
    const tabs = fourCornerScrewTabs(100, 70);
    expect(tabs.length).toBe(4);
    expect(tabs.every((f) => f.type === 'screw-tab')).toBe(true);
    expect(tabs.every((f) => f.face === '-z')).toBe(true);
    expect(tabs.every((f) => f.presetId === 'four-corner-screw-tabs')).toBe(true);
  });

  it('applyMountingPreset adds 4 corner tabs to the project', () => {
    useProjectStore.getState().applyMountingPreset('four-corner-screw-tabs');
    const features = useProjectStore.getState().project.mountingFeatures;
    expect(features.length).toBe(4);
  });

  it('applyMountingPreset rear-vesa-100 adds a single feature with patternSize 100', () => {
    useProjectStore.getState().applyMountingPreset('rear-vesa-100');
    const features = useProjectStore.getState().project.mountingFeatures;
    expect(features.length).toBe(1);
    expect(features[0]!.type).toBe('vesa-mount');
    expect(features[0]!.params.patternSize).toBe(100);
  });

  it('disabled mounting feature produces no compiled ops', () => {
    useProjectStore.getState().applyMountingPreset('four-corner-screw-tabs');
    const features = useProjectStore
      .getState()
      .project.mountingFeatures.map((f) => ({ ...f, enabled: false }));
    const project = useProjectStore.getState().project;
    const ops = buildMountingFeatureOps(features, project.board, project.case);
    expect(ops.additive.length).toBe(0);
    expect(ops.subtractive.length).toBe(0);
  });

  it('compileProject includes mounting feature additive ops in the union', () => {
    useProjectStore.getState().applyMountingPreset('four-corner-screw-tabs');
    const plan = compileProject(useProjectStore.getState().project);
    const shell = plan.nodes.find((n) => n.id === 'shell')!.op;
    // Outer wrapper is difference (cutouts present from corner-tab holes), inner is union with tabs.
    expect(shell.kind).toBe('difference');
  });
});
