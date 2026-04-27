import { useMemo, useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { getBuiltinHat, hatsCompatibleWith } from '@/library/hats';

export function HatsPanel() {
  const board = useProjectStore((s) => s.project.board);
  const hats = useProjectStore((s) => s.project.hats);
  const addHat = useProjectStore((s) => s.addHat);
  const removeHat = useProjectStore((s) => s.removeHat);
  const patchHat = useProjectStore((s) => s.patchHat);
  const setHatPortEnabled = useProjectStore((s) => s.setHatPortEnabled);

  const compatible = useMemo(() => hatsCompatibleWith(board.id), [board.id]);
  const [pickerValue, setPickerValue] = useState('');

  return (
    <div className="panel">
      <h3>HATs / shields</h3>
      <div className="settings-row" style={{ gridTemplateColumns: '1fr auto' }}>
        <select
          value={pickerValue}
          onChange={(e) => setPickerValue(e.target.value)}
          data-testid="hat-picker"
        >
          <option value="">— select a HAT —</option>
          {compatible.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            if (pickerValue) {
              addHat(pickerValue);
              setPickerValue('');
            }
          }}
          disabled={!pickerValue}
          data-testid="hat-add"
        >
          + Add
        </button>
      </div>
      {compatible.length === 0 && (
        <p className="settings-hint">No HATs in the library are compatible with {board.name}.</p>
      )}
      {hats.length === 0 ? (
        <p className="settings-hint">No HATs stacked.</p>
      ) : (
        <ul className="port-list" style={{ marginTop: 8 }}>
          {[...hats]
            .sort((a, b) => a.stackIndex - b.stackIndex)
            .map((h) => {
              const profile = getBuiltinHat(h.hatId);
              const name = profile?.name ?? h.hatId;
              return (
                <li
                  key={h.id}
                  style={{
                    background: '#14181c',
                    borderRadius: 4,
                    padding: '6px 8px',
                    marginBottom: 4,
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={h.enabled}
                      onChange={(e) => patchHat(h.id, { enabled: e.target.checked })}
                      data-testid={`hat-enabled-${h.hatId}`}
                    />
                    <span style={{ flex: 1, fontSize: 12 }}>{name}</span>
                    <button
                      onClick={() => removeHat(h.id)}
                      data-testid={`hat-remove-${h.id}`}
                      style={{ fontSize: 11, padding: '2px 6px' }}
                    >
                      ✕
                    </button>
                  </label>
                  {h.ports.length > 0 && (
                    <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0 18px' }}>
                      {h.ports.map((p) => (
                        <li key={p.id} style={{ fontSize: 11, color: '#8a94a4' }}>
                          <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <input
                              type="checkbox"
                              checked={p.enabled}
                              onChange={(e) =>
                                setHatPortEnabled(h.id, p.id, e.target.checked)
                              }
                            />
                            {p.kind} [{p.facing}]
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
