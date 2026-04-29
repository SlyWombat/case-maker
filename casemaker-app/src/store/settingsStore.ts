import { create } from 'zustand';

export type ExportLayoutMode = 'print-ready' | 'assembled';
export type ExportFormat = 'stl-binary' | 'stl-ascii' | '3mf';

export interface AppSettings {
  port: number;
  bindToAll: boolean;
  exportLayout: ExportLayoutMode;
  exportFormat: ExportFormat;
}

const SETTINGS_KEY = 'casemaker.settings.v1';
const DEFAULT_PORT = 8000;
const DEFAULT_EXPORT_LAYOUT: ExportLayoutMode = 'print-ready';
const DEFAULT_EXPORT_FORMAT: ExportFormat = 'stl-binary';

const DEFAULTS: AppSettings = {
  port: DEFAULT_PORT,
  bindToAll: false,
  exportLayout: DEFAULT_EXPORT_LAYOUT,
  exportFormat: DEFAULT_EXPORT_FORMAT,
};

const VALID_FORMATS: ReadonlySet<ExportFormat> = new Set(['stl-binary', 'stl-ascii', '3mf']);

function loadSettings(): AppSettings {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { ...DEFAULTS };
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      port: clampPort(parsed.port),
      bindToAll: Boolean(parsed.bindToAll),
      exportLayout:
        parsed.exportLayout === 'assembled' || parsed.exportLayout === 'print-ready'
          ? parsed.exportLayout
          : DEFAULT_EXPORT_LAYOUT,
      exportFormat:
        typeof parsed.exportFormat === 'string' && VALID_FORMATS.has(parsed.exportFormat as ExportFormat)
          ? (parsed.exportFormat as ExportFormat)
          : DEFAULT_EXPORT_FORMAT,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function clampPort(n: unknown): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return DEFAULT_PORT;
  const v = Math.floor(n);
  if (v < 1024 || v > 65535) return DEFAULT_PORT;
  return v;
}

function persist(s: AppSettings): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore quota errors
  }
}

export interface SettingsState extends AppSettings {
  setPort: (port: number) => void;
  setBindToAll: (v: boolean) => void;
  setExportLayout: (mode: ExportLayoutMode) => void;
  setExportFormat: (fmt: ExportFormat) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => {
  const initial = loadSettings();
  return {
    ...initial,
    setPort: (port) => {
      const clamped = clampPort(port);
      set({ port: clamped });
      persist({ ...get(), port: clamped });
    },
    setBindToAll: (bindToAll) => {
      set({ bindToAll });
      persist({ ...get(), bindToAll });
    },
    setExportLayout: (mode) => {
      set({ exportLayout: mode });
      persist({ ...get(), exportLayout: mode });
    },
    setExportFormat: (fmt) => {
      set({ exportFormat: fmt });
      persist({ ...get(), exportFormat: fmt });
    },
    resetSettings: () => {
      const fresh = { ...DEFAULTS };
      set(fresh);
      persist(fresh);
    },
  };
});

export const SETTINGS_DEFAULTS = DEFAULTS;
export { clampPort };
