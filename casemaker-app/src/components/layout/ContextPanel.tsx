import { useEffect, useState } from 'react';
import { useViewportStore } from '@/store/viewportStore';
import { SelectionPanel } from '@/components/viewport/SelectionPanel';

/**
 * Issue #93 (Phase 4a) — right-rail context panel. Hosts per-thing detail
 * editors (host / HAT today; ports / catches / features land in 4b-e).
 *
 * Layout:
 * - ≥ 1366 px viewport: fixed 360 px rail to the right of the canvas, always
 *   visible. Left rail (320 px) keeps the always-visible domain pickers.
 * - < 1366 px: rail becomes an off-canvas drawer that auto-opens when
 *   `viewportStore.selection` becomes non-null. A small "▸" tab on the
 *   viewport's right edge lets the user open it manually.
 *
 * Empty state: friendly placeholder text guiding the user to select
 * something. The SelectionPanel itself renders nothing when selection is
 * null, so the placeholder is here.
 */
export function ContextPanel() {
  const selection = useViewportStore((s) => s.selection);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1366 : false,
  );

  // Track viewport width so we can switch between rail and drawer modes.
  useEffect(() => {
    function onResize() {
      setIsCompact(window.innerWidth < 1366);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Auto-open the drawer when something becomes selected (compact only —
  // on a wide viewport the rail is always visible).
  useEffect(() => {
    if (isCompact && selection) setDrawerOpen(true);
  }, [selection, isCompact]);

  const isOpen = !isCompact || drawerOpen;
  const className = [
    'context-panel',
    isCompact ? 'context-panel--drawer' : 'context-panel--rail',
    isOpen ? 'context-panel--open' : 'context-panel--closed',
  ].join(' ');

  return (
    <>
      {isCompact && (
        <button
          type="button"
          className="context-panel__handle"
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label={isOpen ? 'Close context panel' : 'Open context panel'}
          aria-expanded={isOpen}
          title={isOpen ? 'Close (▸)' : 'Open context panel (▸)'}
          data-testid="context-panel-handle"
        >
          {isOpen ? '◂' : '▸'}
        </button>
      )}
      <aside
        className={className}
        data-testid="context-panel"
        aria-label="Context panel"
      >
        {isCompact && (
          <button
            type="button"
            className="context-panel__close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close context panel"
            title="Close"
          >
            ×
          </button>
        )}
        {selection ? (
          <SelectionPanel />
        ) : (
          <div className="context-panel__empty">
            <h3>Selection</h3>
            <p>
              Click the host board, a HAT, or a feature in the viewport to edit
              its properties here.
            </p>
            <p className="context-panel__empty-hint">
              Tip: with the Select tool active, hover the 3D scene to see what
              you can pick.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
