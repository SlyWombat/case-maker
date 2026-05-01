import { useState } from 'react';
import { triggerExport, type ExportFormat } from '@/engine/exportTrigger';
import { DonateButton } from '@/components/layout/DonateButton';
import { useJobStore } from '@/store/jobStore';

const FORMATS: { value: ExportFormat; label: string; testId: string; hint: string }[] = [
  {
    value: 'stl-binary',
    label: 'STL (binary)',
    testId: 'export-stl',
    hint: 'Compact binary STL — fastest export and smallest file. Recommended for most slicers.',
  },
  {
    value: 'stl-ascii',
    label: 'STL (ASCII)',
    testId: 'export-stl-ascii',
    hint: 'Text STL — much larger files, but human-readable for diffs and inspection.',
  },
  {
    value: '3mf',
    label: '3MF',
    testId: 'export-3mf',
    hint: 'Modern 3MF format with units, color, and metadata baked in.',
  },
];

export function ExportPanel() {
  const [busy, setBusy] = useState(false);
  const [exported, setExported] = useState(false);
  // Issue #52 — placement-validator errors WARN before export rather than
  // BLOCK it. Users with edge-case projects need an override path; a hard
  // block leaves them unable to ship. confirm() preserves the safety net
  // (you have to deliberately click through) while keeping the door open.
  const placementReport = useJobStore((s) => s.placementReport);
  const errorCount = placementReport?.errorCount ?? 0;
  const onClick = (format: ExportFormat) => async () => {
    if (errorCount > 0) {
      const errorIssues = placementReport!.issues
        .filter((i) => i.severity === 'error')
        .slice(0, 5)
        .map((i) => `• ${i.message}`)
        .join('\n');
      const more = errorCount > 5 ? `\n…and ${errorCount - 5} more.` : '';
      const ok = window.confirm(
        `Placement validator found ${errorCount} error${errorCount === 1 ? '' : 's'} in this project:\n\n${errorIssues}${more}\n\nExport anyway?`,
      );
      if (!ok) return;
    }
    setBusy(true);
    try {
      await triggerExport(format);
      setExported(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="panel">
      <h3>Export</h3>
      {errorCount > 0 && (
        <p
          className="export-panel__warning"
          style={{ fontSize: 11, color: '#fca5a5', margin: '0 0 8px' }}
          data-testid="export-warning"
        >
          ⚠ {errorCount} placement error{errorCount === 1 ? '' : 's'} — export will prompt to confirm.
        </p>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {FORMATS.map((f) => (
          <button
            key={f.value}
            onClick={onClick(f.value)}
            disabled={busy}
            data-testid={f.testId}
            title={f.hint}
            aria-label={`Export as ${f.label}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {exported && <DonateButton variant="export" />}
    </div>
  );
}
