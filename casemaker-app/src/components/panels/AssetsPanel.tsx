import { useRef, useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { importMeshFile } from '@/engine/import/assetImporter';
import type { ExternalAsset } from '@/types';

const VISIBILITY_OPTIONS: ExternalAsset['visibility'][] = ['reference', 'subtract', 'union'];

export function AssetsPanel() {
  const assets = useProjectStore((s) => s.project.externalAssets);
  const add = useProjectStore((s) => s.addExternalAsset);
  const remove = useProjectStore((s) => s.removeExternalAsset);
  const patch = useProjectStore((s) => s.patchExternalAsset);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const asset = await importMeshFile(f);
      add(asset);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="panel">
      <h3>External assets</h3>
      <button
        onClick={() => fileRef.current?.click()}
        data-testid="import-asset"
        title="Import an STL or 3MF mesh as a reference, subtraction, or union asset."
      >
        Import STL or 3MF
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".stl,.3mf,model/stl,model/3mf,application/sla"
        onChange={onFile}
        style={{ display: 'none' }}
        data-testid="import-asset-input"
        aria-label="Import asset file"
        title="Pick an STL or 3MF file to import."
      />
      {error && <p style={{ color: '#ff8888', fontSize: 11 }}>{error}</p>}
      {assets.length === 0 ? (
        <p className="board-meta">No external assets loaded.</p>
      ) : (
        <ul className="assets-list">
          {assets.map((a) => (
            <li key={a.id}>
              <span title={a.name}>
                {a.name.length > 22 ? `${a.name.slice(0, 20)}…` : a.name}
              </span>
              <select
                className="asset-vis"
                value={a.visibility}
                onChange={(e) =>
                  patch(a.id, { visibility: e.target.value as ExternalAsset['visibility'] })
                }
                data-testid={`asset-visibility-${a.id}`}
                aria-label={`Asset ${a.name} visibility`}
                title="reference = ghosted preview only; subtract = boolean-subtract from case; union = boolean-add to case."
              >
                {VISIBILITY_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <button
                onClick={() => remove(a.id)}
                data-testid={`remove-asset-${a.id}`}
                title={`Remove asset ${a.name}`}
                aria-label={`Remove asset ${a.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
