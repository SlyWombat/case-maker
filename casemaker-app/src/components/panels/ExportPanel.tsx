import { useState } from 'react';
import { triggerExport, type ExportFormat } from '@/engine/exportTrigger';
import { DonateButton } from '@/components/layout/DonateButton';

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
  const onClick = (format: ExportFormat) => async () => {
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
