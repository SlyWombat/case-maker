import { useState } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

export function SettingsPanel() {
  const port = useSettingsStore((s) => s.port);
  const bindAll = useSettingsStore((s) => s.bindToAll);
  const setPort = useSettingsStore((s) => s.setPort);
  const setBindAll = useSettingsStore((s) => s.setBindToAll);
  const reset = useSettingsStore((s) => s.resetSettings);
  const [draft, setDraft] = useState<string>(String(port));

  return (
    <div className="panel">
      <h3>App settings</h3>
      <div className="settings-row">
        <label htmlFor="settings-port">App port</label>
        <input
          id="settings-port"
          type="number"
          min={1024}
          max={65535}
          value={draft}
          className="slider-num"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const n = Number(draft);
            setPort(n);
            setDraft(String(useSettingsStore.getState().port));
          }}
          data-testid="settings-port"
        />
      </div>
      <p className="settings-hint">
        Active port: <strong data-testid="settings-port-active">{port}</strong> (default 8000). The
        installer prompts for this on Windows. Range 1024–65535. Restart needed for desktop builds.
      </p>
      <label
        style={{
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          fontSize: 12,
          margin: '8px 0',
        }}
      >
        <input
          type="checkbox"
          checked={bindAll}
          onChange={(e) => setBindAll(e.target.checked)}
          data-testid="settings-bind-all"
        />
        <span>Allow LAN access (bind 0.0.0.0)</span>
      </label>
      <ExportLayoutSelector />
      <button onClick={reset} data-testid="settings-reset" style={{ fontSize: 11 }}>
        Reset to defaults
      </button>
    </div>
  );
}

function ExportLayoutSelector() {
  const layout = useSettingsStore((s) => s.exportLayout);
  const setLayout = useSettingsStore((s) => s.setExportLayout);
  return (
    <div className="settings-row" style={{ gridTemplateColumns: '1fr auto' }}>
      <label htmlFor="settings-export-layout">Export layout</label>
      <select
        id="settings-export-layout"
        value={layout}
        onChange={(e) => setLayout(e.target.value as 'print-ready' | 'assembled')}
        data-testid="settings-export-layout"
      >
        <option value="print-ready">Print-ready (lid flipped, side-by-side)</option>
        <option value="assembled">Assembled (visualization)</option>
      </select>
    </div>
  );
}
