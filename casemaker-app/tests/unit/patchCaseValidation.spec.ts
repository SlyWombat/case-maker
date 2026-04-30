import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useProjectStore, createDefaultProject } from '@/store/projectStore';

describe('patchCase schema validation (#56)', () => {
  beforeEach(() => {
    useProjectStore.getState().setProject(createDefaultProject('rpi-4b'));
  });

  let errSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    errSpy.mockRestore();
  });

  it('accepts a valid patch and updates state', () => {
    useProjectStore.getState().patchCase({ wallThickness: 3 });
    expect(useProjectStore.getState().project.case.wallThickness).toBe(3);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('rejects a negative wallThickness and leaves state unchanged', () => {
    const before = useProjectStore.getState().project.case.wallThickness;
    // Cast through unknown — runtime sends bad data, type system would never let
    // this through; that's the whole point of the runtime guard.
    useProjectStore.getState().patchCase({ wallThickness: -1 } as unknown as Partial<typeof useProjectStore.getState.prototype>);
    const after = useProjectStore.getState().project.case.wallThickness;
    expect(after).toBe(before);
    expect(errSpy).toHaveBeenCalled();
  });

  it('rejects an unknown joint enum value and leaves state unchanged', () => {
    const before = useProjectStore.getState().project.case.joint;
    useProjectStore
      .getState()
      .patchCase({ joint: 'completely-invalid' } as unknown as Partial<typeof useProjectStore.getState.prototype>);
    const after = useProjectStore.getState().project.case.joint;
    expect(after).toBe(before);
    expect(errSpy).toHaveBeenCalled();
  });

  it('rejects a wrong type (string for lidThickness) and leaves state unchanged', () => {
    const before = useProjectStore.getState().project.case.lidThickness;
    useProjectStore
      .getState()
      .patchCase({ lidThickness: 'thick' } as unknown as Partial<typeof useProjectStore.getState.prototype>);
    expect(useProjectStore.getState().project.case.lidThickness).toBe(before);
    expect(errSpy).toHaveBeenCalled();
  });

  it("preprocesses legacy joint='sliding' to 'flat-lid'", () => {
    // 'sliding' was a removed enum value; the schema's preprocess maps it to
    // 'flat-lid' so legacy projects keep loading. patchCase honors that
    // transform so the in-session write goes through preprocess too.
    useProjectStore
      .getState()
      .patchCase({ joint: 'sliding' } as unknown as Partial<typeof useProjectStore.getState.prototype>);
    expect(useProjectStore.getState().project.case.joint).toBe('flat-lid');
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('still auto-populates snap catches when joint flips to snap-fit', () => {
    expect(useProjectStore.getState().project.case.snapCatches).toBeUndefined();
    useProjectStore.getState().patchCase({ joint: 'snap-fit' });
    const catches = useProjectStore.getState().project.case.snapCatches;
    expect(catches).toBeDefined();
    expect(catches!.length).toBeGreaterThan(0);
  });
});
