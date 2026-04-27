import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { Toolbar } from './Toolbar';
import { Viewport } from '@/components/viewport/Viewport';
import { useRebuildOnProjectChange } from '@/hooks/useRebuildOnProjectChange';
import { undoProject, redoProject } from '@/store/projectStore';

function useUndoRedoShortcuts(): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undoProject();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        redoProject();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function AppShell() {
  useRebuildOnProjectChange();
  useUndoRedoShortcuts();
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Case Maker</h1>
        <Toolbar />
      </header>
      <main className="app-main">
        <Sidebar />
        <div className="viewport-pane">
          <Viewport />
        </div>
      </main>
      <StatusBar />
    </div>
  );
}
