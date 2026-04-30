import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore, createDefaultProject } from '@/store/projectStore';
import { getBuiltinBoard } from '@/library';

/**
 * Issue #82 — createDefaultProject now starts the project editable. The
 * "cannot add components on a built-in board" guard is still enforced by
 * the store, but it only fires for legacy disk projects where the saved
 * board still has builtin: true. We exercise that path explicitly below.
 */
function loadAsLegacyBuiltin(boardId: string): void {
  const project = createDefaultProject(boardId);
  const builtin = getBuiltinBoard(boardId)!;
  project.board = structuredClone(builtin);
  useProjectStore.getState().setProject(project);
}

describe('component editor — day-1 (#82)', () => {
  beforeEach(() => {
    useProjectStore.getState().setProject(createDefaultProject('rpi-4b'));
  });

  it('addComponent works on day-1, with sensible defaults', () => {
    const before = useProjectStore.getState().project.board.components.length;
    useProjectStore.getState().addComponent();
    const components = useProjectStore.getState().project.board.components;
    expect(components.length).toBe(before + 1);
    const newest = components[components.length - 1]!;
    expect(newest.kind).toBe('custom');
    expect(newest.facing).toBe('+y');
  });

  it('removeComponent also drops any port that referenced it', () => {
    const project = useProjectStore.getState().project;
    const target = project.board.components.find((c) => c.facing && c.facing !== '+z')!;
    expect(project.ports.some((p) => p.sourceComponentId === target.id)).toBe(true);
    useProjectStore.getState().removeComponent(target.id);
    const after = useProjectStore.getState().project;
    expect(after.board.components.find((c) => c.id === target.id)).toBeUndefined();
    expect(after.ports.find((p) => p.sourceComponentId === target.id)).toBeUndefined();
  });

  it('patchComponent flows changes to the matching port', () => {
    const target = useProjectStore
      .getState()
      .project.board.components.find((c) => c.facing && c.facing !== '+z')!;
    useProjectStore.getState().patchComponent(target.id, {
      kind: 'usb-c',
      facing: '+x',
      position: { x: 50 },
    });
    const updatedComp = useProjectStore
      .getState()
      .project.board.components.find((c) => c.id === target.id)!;
    expect(updatedComp.kind).toBe('usb-c');
    expect(updatedComp.facing).toBe('+x');
    expect(updatedComp.position.x).toBe(50);
    const updatedPort = useProjectStore
      .getState()
      .project.ports.find((p) => p.sourceComponentId === target.id);
    expect(updatedPort?.kind).toBe('usb-c');
    expect(updatedPort?.facing).toBe('+x');
    expect(updatedPort?.position.x).toBe(50);
  });
});

describe('component editor — legacy disk projects (pre-#82)', () => {
  beforeEach(() => {
    loadAsLegacyBuiltin('rpi-4b');
  });

  it('cannot add components on a built-in board', () => {
    const before = useProjectStore.getState().project.board.components.length;
    useProjectStore.getState().addComponent();
    expect(useProjectStore.getState().project.board.components.length).toBe(before);
  });
});
