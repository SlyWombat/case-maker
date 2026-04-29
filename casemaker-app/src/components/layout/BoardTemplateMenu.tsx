// Issue #75 — Board + Template selector tucked behind a header pull-down so
// they don't take up sidebar real estate after the user has picked a starting
// point. Same UX pattern as the gear menu (#74): outside-click + Escape close.

import { useEffect, useRef, useState } from 'react';
import { clearHistory, useProjectStore } from '@/store/projectStore';
import { listBuiltinBoardIds } from '@/library';
import { TEMPLATES, findTemplate } from '@/library/templates';
import { scheduleImmediate } from '@/engine/jobs/JobScheduler';

export function BoardTemplateMenu() {
  const board = useProjectStore((s) => s.project.board);
  const loadBoard = useProjectStore((s) => s.loadBuiltinBoard);
  const setProject = useProjectStore((s) => s.setProject);
  const ids = listBuiltinBoardIds();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent): void {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false);
    }
    const t = setTimeout(() => document.addEventListener('mousedown', onDocClick), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onPickBoard = (id: string): void => {
    loadBoard(id);
    setOpen(false);
  };

  const onPickTemplate = async (id: string): Promise<void> => {
    const t = findTemplate(id);
    if (!t) return;
    if (
      !window.confirm(
        `Replace the current project with template "${t.name}"? Unsaved changes will be lost.`,
      )
    )
      return;
    const project = t.build();
    setProject(project);
    clearHistory();
    setOpen(false);
    await scheduleImmediate(project);
  };

  return (
    <div className="toolbar-board-wrap" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        data-testid="board-template-open"
        title="Switch board or apply a template"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        🔧 {board.name}
      </button>
      {open && (
        <div className="board-template-menu" role="dialog" aria-label="Board and templates" data-testid="board-template-menu">
          <h3>Board</h3>
          <select
            value={board.id}
            onChange={(e) => onPickBoard(e.target.value)}
            data-testid="board-select"
          >
            {ids.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <p className="board-meta">
            {board.pcb.size.x} × {board.pcb.size.y} × {board.pcb.size.z} mm
          </p>

          <h3>Templates</h3>
          <p className="settings-hint">One-click starter projects.</p>
          <ul className="board-template-list">
            {TEMPLATES.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => {
                    void onPickTemplate(t.id);
                  }}
                  data-testid={`template-${t.id}`}
                >
                  <div className="board-template-name">{t.name}</div>
                  <div className="board-template-desc">
                    {t.description} · ~{t.estPrintMinutes} min
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
