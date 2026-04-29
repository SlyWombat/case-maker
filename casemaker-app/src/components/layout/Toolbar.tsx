import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useProjectStore,
  undoProject,
  redoProject,
  clearHistory,
} from '@/store/projectStore';
import { useViewportStore } from '@/store/viewportStore';
import { useSettingsStore } from '@/store/settingsStore';
import { downloadProjectJson, readProjectFromFile } from '@/store/persistence';
import { triggerExport } from '@/engine/exportTrigger';
import { DocsModal } from '@/components/docs/DocsModal';
import { SettingsMenu } from '@/components/layout/SettingsMenu';

const FORMAT_LABEL: Record<string, string> = {
  'stl-binary': 'STL (binary)',
  'stl-ascii': 'STL (ASCII)',
  '3mf': '3MF',
};

export function Toolbar() {
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);
  const showWelcome = useProjectStore((s) => s.showWelcome);
  const showLid = useViewportStore((s) => s.showLid);
  const toggleShowLid = useViewportStore((s) => s.toggleShowLid);
  const boardVisualization = useViewportStore((s) => s.boardVisualization);
  const cycleBoardVisualization = useViewportStore((s) => s.cycleBoardVisualization);
  const exportFormat = useSettingsStore((s) => s.exportFormat);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'l' && e.key !== 'L') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      toggleShowLid();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleShowLid]);

  const onSave = useCallback(() => {
    downloadProjectJson(project);
  }, [project]);

  const onLoadClick = useCallback(() => {
    fileInput.current?.click();
  }, []);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        const loaded = await readProjectFromFile(f);
        setProject(loaded);
        clearHistory();
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (fileInput.current) fileInput.current.value = '';
      }
    },
    [setProject],
  );

  const onNew = useCallback(() => {
    if (!window.confirm('Start a new project? Unsaved changes will be lost.')) return;
    showWelcome();
    clearHistory();
  }, [showWelcome]);

  const onExport = useCallback(async () => {
    setExporting(true);
    try {
      await triggerExport(useSettingsStore.getState().exportFormat);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <div className="toolbar-buttons">
      <button
        onClick={onNew}
        data-testid="new-project"
        title="Start a new project (returns to the board / template picker)"
      >
        ✨ New
      </button>
      <button onClick={undoProject} data-testid="undo-btn" title="Undo (Ctrl+Z)">
        ↶ Undo
      </button>
      <button onClick={redoProject} data-testid="redo-btn" title="Redo (Ctrl+Shift+Z)">
        ↷ Redo
      </button>
      <button
        onClick={onSave}
        data-testid="save-project"
        title="Save the current project to a .caseproj.json file"
      >
        💾 Save
      </button>
      <button
        onClick={onLoadClick}
        data-testid="load-project"
        title="Load a project from a .caseproj.json file"
      >
        📂 Load
      </button>
      <button
        onClick={onExport}
        disabled={exporting}
        data-testid="export-default"
        title={`Export current case as ${FORMAT_LABEL[exportFormat] ?? exportFormat} (change format in ⚙)`}
      >
        {exporting ? '⏳ Exporting…' : '⬇ Export'}
      </button>
      <input
        ref={fileInput}
        type="file"
        accept=".json,.caseproj.json,application/json"
        onChange={onFileChange}
        data-testid="load-project-input"
      />
      <button
        onClick={toggleShowLid}
        data-testid="toggle-lid-btn"
        title="Show/hide lid (L)"
        aria-pressed={showLid}
      >
        {showLid ? '👁 Lid' : '🚫 Lid'}
      </button>
      <button
        onClick={cycleBoardVisualization}
        data-testid="cycle-board-visualization-btn"
        title="Cycle board visualization: schematic / photo / 3D"
      >
        Board: {boardVisualization}
      </button>
      <button
        onClick={() => setDocsOpen(true)}
        data-testid="docs-open"
        title="Open the User Manual"
      >
        📖 Docs
      </button>
      <div className="toolbar-settings-wrap">
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          data-testid="settings-open"
          title="App settings"
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
        >
          ⚙
        </button>
        {settingsOpen && <SettingsMenu onClose={() => setSettingsOpen(false)} />}
      </div>
      {error && <span style={{ color: '#ff8888', fontSize: 12 }}>{error}</span>}
      {docsOpen && <DocsModal initialId="user-manual" onClose={() => setDocsOpen(false)} />}
    </div>
  );
}
