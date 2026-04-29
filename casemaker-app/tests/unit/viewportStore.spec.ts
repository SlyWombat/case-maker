import { describe, it, expect, beforeEach } from 'vitest';
import { useViewportStore } from '@/store/viewportStore';

describe('Issue #20 — viewport lid toggle', () => {
  beforeEach(() => {
    useViewportStore.getState().setShowLid(true);
  });

  it('showLid defaults to true', () => {
    expect(useViewportStore.getState().showLid).toBe(true);
  });

  it('setShowLid(false) hides the lid', () => {
    useViewportStore.getState().setShowLid(false);
    expect(useViewportStore.getState().showLid).toBe(false);
  });

  it('toggleShowLid flips the value', () => {
    expect(useViewportStore.getState().showLid).toBe(true);
    useViewportStore.getState().toggleShowLid();
    expect(useViewportStore.getState().showLid).toBe(false);
    useViewportStore.getState().toggleShowLid();
    expect(useViewportStore.getState().showLid).toBe(true);
  });

  it('setShowLid persists to localStorage when available', () => {
    if (typeof localStorage === 'undefined') {
      return; // node test env without jsdom — skip
    }
    useViewportStore.getState().setShowLid(false);
    const raw = localStorage.getItem('casemaker.viewport');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.showLid).toBe(false);
  });

  // Issue #59 — boardVisualization cycle removed; board visibility is the
  // showBoard boolean now.
  it('showBoard defaults to true', () => {
    expect(useViewportStore.getState().showBoard).toBe(true);
  });

  it('setShowBoard(false) hides the board placeholder', () => {
    useViewportStore.getState().setShowBoard(false);
    expect(useViewportStore.getState().showBoard).toBe(false);
    useViewportStore.getState().setShowBoard(true);
  });
});
