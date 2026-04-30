import { describe, it, expect, beforeEach } from 'vitest';
import { useViewportStore } from '@/store/viewportStore';

/**
 * Issue #83 — host PCB / HAT in-viewport selection. Lives in viewportStore
 * so the SelectionPanel + keyboard nudge handler can subscribe without
 * threading prop drilling through the scene graph. Selection is
 * SESSION-SCOPED — never written to localStorage so a stale ID can't point
 * at a HAT placement that was deleted between sessions.
 */
describe('Issue #83 — viewport selection', () => {
  beforeEach(() => {
    useViewportStore.getState().setSelection(null);
  });

  it('default selection is null', () => {
    expect(useViewportStore.getState().selection).toBeNull();
  });

  it('setSelection({ kind: "host" }) updates state', () => {
    useViewportStore.getState().setSelection({ kind: 'host' });
    expect(useViewportStore.getState().selection).toEqual({ kind: 'host' });
  });

  it('setSelection({ kind: "hat", hatPlacementId }) carries the placement id', () => {
    useViewportStore
      .getState()
      .setSelection({ kind: 'hat', hatPlacementId: 'hat-123' });
    const sel = useViewportStore.getState().selection;
    expect(sel).not.toBeNull();
    if (!sel) return;
    expect(sel.kind).toBe('hat');
    if (sel.kind === 'hat') {
      expect(sel.hatPlacementId).toBe('hat-123');
    }
  });

  it('setSelection(null) clears the selection', () => {
    useViewportStore.getState().setSelection({ kind: 'host' });
    useViewportStore.getState().setSelection(null);
    expect(useViewportStore.getState().selection).toBeNull();
  });

  it('selection is NOT persisted to localStorage', () => {
    if (typeof localStorage === 'undefined') return; // skip in node env
    useViewportStore.getState().setSelection({ kind: 'host' });
    const raw = localStorage.getItem('casemaker.viewport');
    if (raw === null) {
      // Persistence hasn't fired (no other settable flag changed) — that
      // alone is proof selection didn't trigger a write. OK.
      return;
    }
    const parsed = JSON.parse(raw);
    expect(parsed.selection).toBeUndefined();
  });

  it('selection survives only in memory — re-reading the store after a setShowLid persist does not bring it back as a string keyed "selection"', () => {
    if (typeof localStorage === 'undefined') return;
    useViewportStore.getState().setSelection({
      kind: 'hat',
      hatPlacementId: 'h-keep-me-out-of-disk',
    });
    // Trigger a persisted write by toggling another field.
    useViewportStore.getState().setShowLid(false);
    const raw = localStorage.getItem('casemaker.viewport');
    expect(raw).not.toBeNull();
    expect(raw).not.toContain('h-keep-me-out-of-disk');
    // restore for other tests
    useViewportStore.getState().setShowLid(true);
  });
});
