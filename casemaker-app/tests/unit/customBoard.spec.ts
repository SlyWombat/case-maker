import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore, createDefaultProject } from '@/store/projectStore';

describe('custom board editor', () => {
  beforeEach(() => {
    useProjectStore.getState().setProject(createDefaultProject('rpi-4b'));
  });

  it('builtin board cannot be edited via patchBoardPcb', () => {
    const before = useProjectStore.getState().project.board.pcb.size.x;
    useProjectStore.getState().patchBoardPcb({ x: 999 });
    const after = useProjectStore.getState().project.board.pcb.size.x;
    expect(after).toBe(before);
  });

  it('cloneBoardForEditing flips builtin to false and lets edits through', () => {
    expect(useProjectStore.getState().project.board.builtin).toBe(true);
    useProjectStore.getState().cloneBoardForEditing();
    expect(useProjectStore.getState().project.board.builtin).toBe(false);
    useProjectStore.getState().patchBoardPcb({ x: 70 });
    expect(useProjectStore.getState().project.board.pcb.size.x).toBe(70);
  });

  it('addMountingHole / removeMountingHole only work on custom boards', () => {
    const beforeBuiltin = useProjectStore.getState().project.board.mountingHoles.length;
    useProjectStore.getState().addMountingHole();
    expect(useProjectStore.getState().project.board.mountingHoles.length).toBe(beforeBuiltin);
    useProjectStore.getState().cloneBoardForEditing();
    useProjectStore.getState().addMountingHole();
    const after = useProjectStore.getState().project.board.mountingHoles;
    expect(after.length).toBe(beforeBuiltin + 1);
    useProjectStore.getState().removeMountingHole(after[after.length - 1]!.id);
    expect(useProjectStore.getState().project.board.mountingHoles.length).toBe(beforeBuiltin);
  });

  it('patchMountingHole updates only the targeted hole', () => {
    useProjectStore.getState().cloneBoardForEditing();
    const id = useProjectStore.getState().project.board.mountingHoles[0]!.id;
    useProjectStore.getState().patchMountingHole(id, { x: 12.5, diameter: 3.5 });
    const updated = useProjectStore
      .getState()
      .project.board.mountingHoles.find((h) => h.id === id)!;
    expect(updated.x).toBe(12.5);
    expect(updated.diameter).toBe(3.5);
  });
});
