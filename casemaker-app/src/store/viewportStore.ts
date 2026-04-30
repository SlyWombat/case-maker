import { create } from 'zustand';

const LS_KEY = 'casemaker.viewport';

// Issue #59 — board visualization cycle (schematic / photo / 3d) was a
// no-op: no built-in board carries a `visualAssets.glb` or `topImage`, so
// every project rendered as the schematic placeholder regardless of mode.
// The cycle button + fallback banner are removed; board visibility is now
// just a single `showBoard` boolean. Re-introduce the cycle when GLB
// assets actually exist (issue #39 phase 2).

// Issue #86 — toolbar overlay state. ActiveTool drives the click-handler
// for the viewport (Select gates #83's hit-testing); CameraMode snaps
// OrbitControls to canonical views.
export type ViewportTool = 'select' | 'pan' | 'orbit';
export type ViewportCameraMode = 'perspective' | 'top' | 'front' | 'side';

// Issue #83 — host PCB / HAT in-viewport selection. Session-scoped (NOT
// persisted) — fresh page load = no selection. The selection drives
// SelectionPanel and the keyboard nudge handler.
export type ViewportSelection =
  | { kind: 'host' }
  | { kind: 'hat'; hatPlacementId: string }
  | null;

interface PersistedViewportFlags {
  showLid?: boolean;
  showBoard?: boolean;
  showGrid?: boolean;
  activeTool?: ViewportTool;
  cameraMode?: ViewportCameraMode;
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
  // Issue #83 — explicit whitelist so callers passing `{ ...get(), ... }`
  // can't leak runtime-only fields (e.g. session-scoped `selection`) into
  // localStorage. Only the documented PersistedViewportFlags keys land on
  // disk.
  const out: PersistedViewportFlags = {};
  if (flags.showLid !== undefined) out.showLid = flags.showLid;
  if (flags.showBoard !== undefined) out.showBoard = flags.showBoard;
  if (flags.showGrid !== undefined) out.showGrid = flags.showGrid;
  if (flags.activeTool !== undefined) out.activeTool = flags.activeTool;
  if (flags.cameraMode !== undefined) out.cameraMode = flags.cameraMode;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(out));
  } catch {
    /* quota or private mode — fall back silently */
  }
}

export interface ViewportState {
  showLid: boolean;
  showBoard: boolean;
  showGrid: boolean;
  selectedPortId: string | null;
  activeTool: ViewportTool;
  cameraMode: ViewportCameraMode;
  /** Issue #83 — host PCB / HAT in-viewport selection. */
  selection: ViewportSelection;
  setShowLid: (v: boolean) => void;
  setShowBoard: (v: boolean) => void;
  setShowGrid: (v: boolean) => void;
  toggleShowLid: () => void;
  selectPort: (id: string | null) => void;
  setActiveTool: (t: ViewportTool) => void;
  setCameraMode: (m: ViewportCameraMode) => void;
  setSelection: (s: ViewportSelection) => void;
}

const persisted = loadPersisted();

export const useViewportStore = create<ViewportState>()((set, get) => ({
  showLid: persisted.showLid ?? true,
  showBoard: persisted.showBoard ?? true,
  showGrid: persisted.showGrid ?? true,
  selectedPortId: null,
  activeTool: persisted.activeTool ?? 'orbit',
  cameraMode: persisted.cameraMode ?? 'perspective',
  // Issue #83 — selection is session-scoped. Intentionally NOT loaded from
  // (or written to) localStorage so opening a project never resurrects a
  // stale selection that points at a HAT placement that may no longer
  // exist.
  selection: null,
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
  setActiveTool: (t) => {
    set({ activeTool: t });
    savePersisted({ ...get(), activeTool: t });
  },
  setCameraMode: (m) => {
    set({ cameraMode: m });
    savePersisted({ ...get(), cameraMode: m });
  },
  setSelection: (s) => set({ selection: s }),
}));
