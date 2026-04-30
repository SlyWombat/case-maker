import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore, createDefaultProject } from '@/store/projectStore';
import { getBuiltinBoard } from '@/library';

/**
 * Issue #82 — createDefaultProject now starts the project with an editable
 * (builtin: false) clone of the built-in profile, so day-1 board edits work
 * without an explicit "Clone for editing" click. We keep separate tests for
 * the legacy disk-project path where builtin: true survived JSON round-trip
 * (cloneBoardForEditing still gates that case — see cloneBoard.spec.ts).
 */
function loadAsLegacyBuiltin(boardId: string): void {
  const project = createDefaultProject(boardId);
  const builtin = getBuiltinBoard(boardId)!;
  project.board = structuredClone(builtin);
  useProjectStore.getState().setProject(project);
}

describe('custom board editor — day-1 (#82)', () => {
  beforeEach(() => {
    useProjectStore.getState().setProject(createDefaultProject('rpi-4b'));
  });

  it('day-1 project starts with builtin: false (no Clone-for-editing click needed)', () => {
    expect(useProjectStore.getState().project.board.builtin).toBe(false);
  });

  it('day-1 project board id is custom-prefixed and tracks clonedFrom', () => {
    const board = useProjectStore.getState().project.board;
    expect(board.id.startsWith('custom-rpi-4b-')).toBe(true);
    expect(board.clonedFrom).toBe('rpi-4b');
  });

  it('patchBoardPcb works without an explicit clone step', () => {
    useProjectStore.getState().patchBoardPcb({ x: 70 });
    expect(useProjectStore.getState().project.board.pcb.size.x).toBe(70);
  });

  it('addMountingHole / removeMountingHole work without an explicit clone step', () => {
    const before = useProjectStore.getState().project.board.mountingHoles.length;
    useProjectStore.getState().addMountingHole();
    const after = useProjectStore.getState().project.board.mountingHoles;
    expect(after.length).toBe(before + 1);
    useProjectStore.getState().removeMountingHole(after[after.length - 1]!.id);
    expect(useProjectStore.getState().project.board.mountingHoles.length).toBe(before);
  });

  it('patchMountingHole updates only the targeted hole', () => {
    const id = useProjectStore.getState().project.board.mountingHoles[0]!.id;
    useProjectStore.getState().patchMountingHole(id, { x: 12.5, diameter: 3.5 });
    const updated = useProjectStore
      .getState()
      .project.board.mountingHoles.find((h) => h.id === id)!;
    expect(updated.x).toBe(12.5);
    expect(updated.diameter).toBe(3.5);
  });
});

describe('custom board editor — legacy disk projects (pre-#82 saves)', () => {
  beforeEach(() => {
    loadAsLegacyBuiltin('rpi-4b');
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

  it('addMountingHole gated on builtin: only works after cloneBoardForEditing', () => {
    const beforeBuiltin = useProjectStore.getState().project.board.mountingHoles.length;
    useProjectStore.getState().addMountingHole();
    expect(useProjectStore.getState().project.board.mountingHoles.length).toBe(beforeBuiltin);
    useProjectStore.getState().cloneBoardForEditing();
    useProjectStore.getState().addMountingHole();
    expect(useProjectStore.getState().project.board.mountingHoles.length).toBe(beforeBuiltin + 1);
  });
});
