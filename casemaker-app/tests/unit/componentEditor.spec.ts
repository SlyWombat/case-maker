import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore, createDefaultProject } from '@/store/projectStore';

describe('component editor', () => {
  beforeEach(() => {
    useProjectStore.getState().setProject(createDefaultProject('rpi-4b'));
  });

  it('cannot add components on a built-in board', () => {
    const before = useProjectStore.getState().project.board.components.length;
    useProjectStore.getState().addComponent();
    expect(useProjectStore.getState().project.board.components.length).toBe(before);
  });

  it('addComponent works after cloning, with sensible defaults', () => {
    useProjectStore.getState().cloneBoardForEditing();
    const before = useProjectStore.getState().project.board.components.length;
    useProjectStore.getState().addComponent();
    const components = useProjectStore.getState().project.board.components;
    expect(components.length).toBe(before + 1);
    const newest = components[components.length - 1]!;
    expect(newest.kind).toBe('custom');
    expect(newest.facing).toBe('+y');
  });

  it('removeComponent also drops any port that referenced it', () => {
    useProjectStore.getState().cloneBoardForEditing();
    const project = useProjectStore.getState().project;
    const target = project.board.components.find((c) => c.facing && c.facing !== '+z')!;
    expect(project.ports.some((p) => p.sourceComponentId === target.id)).toBe(true);
    useProjectStore.getState().removeComponent(target.id);
    const after = useProjectStore.getState().project;
    expect(after.board.components.find((c) => c.id === target.id)).toBeUndefined();
    expect(after.ports.find((p) => p.sourceComponentId === target.id)).toBeUndefined();
  });

  it('patchComponent flows changes to the matching port', () => {
    useProjectStore.getState().cloneBoardForEditing();
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
