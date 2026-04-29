import { create } from 'zustand';

const LS_KEY = 'casemaker.viewport';

// Issue #59 — board visualization cycle (schematic / photo / 3d) was a
// no-op: no built-in board carries a `visualAssets.glb` or `topImage`, so
// every project rendered as the schematic placeholder regardless of mode.
// The cycle button + fallback banner are removed; board visibility is now
// just a single `showBoard` boolean. Re-introduce the cycle when GLB
// assets actually exist (issue #39 phase 2).

interface PersistedViewportFlags {
  showLid?: boolean;
  showBoard?: boolean;
  showGrid?: boolean;
}

function loadPersisted(): PersistedViewportFlags {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedViewportFlags;
    return parsed;
  } catch {
    return {};
  }
}

function savePersisted(flags: PersistedViewportFlags): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(flags));
  } catch {
    /* quota or private mode — fall back silently */
  }
}

export interface ViewportState {
  showLid: boolean;
  showBoard: boolean;
  showGrid: boolean;
  selectedPortId: string | null;
  setShowLid: (v: boolean) => void;
  setShowBoard: (v: boolean) => void;
  setShowGrid: (v: boolean) => void;
  toggleShowLid: () => void;
  selectPort: (id: string | null) => void;
}

const persisted = loadPersisted();

export const useViewportStore = create<ViewportState>()((set, get) => ({
  showLid: persisted.showLid ?? true,
  showBoard: persisted.showBoard ?? true,
  showGrid: persisted.showGrid ?? true,
  selectedPortId: null,
  setShowLid: (v) => {
    set({ showLid: v });
    savePersisted({ ...get(), showLid: v });
  },
  setShowBoard: (v) => {
    set({ showBoard: v });
    savePersisted({ ...get(), showBoard: v });
  },
  setShowGrid: (v) => {
    set({ showGrid: v });
    savePersisted({ ...get(), showGrid: v });
  },
  toggleShowLid: () => {
    const next = !get().showLid;
    set({ showLid: next });
    savePersisted({ ...get(), showLid: next });
  },
  selectPort: (id) => set({ selectedPortId: id }),
}));
