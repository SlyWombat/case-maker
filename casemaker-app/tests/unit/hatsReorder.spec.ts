import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore, createDefaultProject } from '@/store/projectStore';

describe('Issue #25 — HatsPanel reorder via patchHat(stackIndex)', () => {
  beforeEach(() => {
    useProjectStore.getState().setProject(createDefaultProject('arduino-uno-r3'));
  });

  it('two HATs added in sequence have stackIndex 0 and 1', () => {
    useProjectStore.getState().addHat('cqrobot-dmx-shield-max485');
    useProjectStore.getState().addHat('arduino-ethernet-shield-2');
    const hats = [...useProjectStore.getState().project.hats].sort(
      (a, b) => a.stackIndex - b.stackIndex,
    );
    expect(hats[0]!.stackIndex).toBe(0);
    expect(hats[1]!.stackIndex).toBe(1);
  });

  it('swapping stackIndex via patchHat reverses the order', () => {
    useProjectStore.getState().addHat('cqrobot-dmx-shield-max485');
    useProjectStore.getState().addHat('arduino-ethernet-shield-2');
    let hats = [...useProjectStore.getState().project.hats].sort(
      (a, b) => a.stackIndex - b.stackIndex,
    );
    const a = hats[0]!;
    const b = hats[1]!;
    useProjectStore.getState().patchHat(a.id, { stackIndex: b.stackIndex });
    useProjectStore.getState().patchHat(b.id, { stackIndex: a.stackIndex });
    hats = [...useProjectStore.getState().project.hats].sort(
      (x, y) => x.stackIndex - y.stackIndex,
    );
    expect(hats[0]!.id).toBe(b.id);
    expect(hats[1]!.id).toBe(a.id);
  });

  it('removeHat removes by placement id, leaves others intact', () => {
    useProjectStore.getState().addHat('cqrobot-dmx-shield-max485');
    useProjectStore.getState().addHat('arduino-ethernet-shield-2');
    const ids = useProjectStore.getState().project.hats.map((h) => h.id);
    useProjectStore.getState().removeHat(ids[0]!);
    const remaining = useProjectStore.getState().project.hats;
    expect(remaining.length).toBe(1);
    expect(remaining[0]!.id).toBe(ids[1]);
  });
});
