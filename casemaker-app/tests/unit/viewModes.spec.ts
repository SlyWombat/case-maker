import { describe, it, expect, beforeEach } from 'vitest';
import { useViewportStore } from '@/store/viewportStore';

describe('viewport view modes (#91)', () => {
  beforeEach(() => {
    useViewportStore.setState({
      viewMode: 'exploded',
      showLid: true,
      showBoard: true,
      activeTool: 'orbit',
      cameraMode: 'perspective',
    });
  });

  it("default viewMode is 'exploded'", () => {
    // (We just set it to exploded in beforeEach to normalize, but the
    // underlying store default also lands here on a fresh load.)
    expect(useViewportStore.getState().viewMode).toBe('exploded');
  });

  it("setViewMode('base-only') hides the lid (showLid mirrors)", () => {
    useViewportStore.getState().setViewMode('base-only');
    const s = useViewportStore.getState();
    expect(s.viewMode).toBe('base-only');
    expect(s.showLid).toBe(false);
  });

  it("setViewMode('lid-only') keeps showLid true (lid is visible, shell is hidden)", () => {
    useViewportStore.getState().setViewMode('lid-only');
    const s = useViewportStore.getState();
    expect(s.viewMode).toBe('lid-only');
    expect(s.showLid).toBe(true);
  });

  it("setViewMode('complete') and 'exploded' both keep the lid visible", () => {
    useViewportStore.getState().setViewMode('complete');
    expect(useViewportStore.getState().showLid).toBe(true);
    useViewportStore.getState().setViewMode('exploded');
    expect(useViewportStore.getState().showLid).toBe(true);
  });

  it('persists viewMode to localStorage on change', () => {
    if (typeof localStorage === 'undefined') return;
    useViewportStore.getState().setViewMode('complete');
    const raw = localStorage.getItem('casemaker.viewport');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).viewMode).toBe('complete');
  });

  it('does NOT leak `selection` into localStorage even when set', () => {
    // Issue #83 — selection is session-scoped. Re-verify the whitelist
    // continues to keep it out of disk after the #91 viewMode addition.
    if (typeof localStorage === 'undefined') return;
    useViewportStore.setState({ selection: { kind: 'host' } });
    useViewportStore.getState().setViewMode('exploded');
    const raw = localStorage.getItem('casemaker.viewport');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).selection).toBeUndefined();
  });
});
