import { create } from 'zustand';

export interface AppSettings {
  port: number;
  bindToAll: boolean;
}

const SETTINGS_KEY = 'casemaker.settings.v1';
const DEFAULT_PORT = 8000;

function loadSettings(): AppSettings {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { port: DEFAULT_PORT, bindToAll: false };
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { port: DEFAULT_PORT, bindToAll: false };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const port = clampPort(parsed.port);
    return {
      port,
      bindToAll: Boolean(parsed.bindToAll),
    };
  } catch {
    return { port: DEFAULT_PORT, bindToAll: false };
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
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => {
  const initial = loadSettings();
  return {
    ...initial,
    setPort: (port) => {
      const clamped = clampPort(port);
      set({ port: clamped });
      persist({ port: clamped, bindToAll: get().bindToAll });
    },
    setBindToAll: (bindToAll) => {
      set({ bindToAll });
      persist({ port: get().port, bindToAll });
    },
    resetSettings: () => {
      const fresh = { port: DEFAULT_PORT, bindToAll: false };
      set(fresh);
      persist(fresh);
    },
  };
});

export const SETTINGS_DEFAULTS = { port: DEFAULT_PORT, bindToAll: false };
export { clampPort };
