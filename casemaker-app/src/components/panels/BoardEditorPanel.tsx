import { useProjectStore } from '@/store/projectStore';
import type { ComponentKind, Facing } from '@/types';

const KIND_OPTIONS: ComponentKind[] = [
  'usb-c',
  'usb-a',
  'usb-b',
  'micro-usb',
  'hdmi',
  'micro-hdmi',
  'barrel-jack',
  'ethernet-rj45',
  'gpio-header',
  'sd-card',
  'custom',
];

const FACING_OPTIONS: Facing[] = ['+x', '-x', '+y', '-y', '+z'];

interface NumInputProps {
  value: number;
  step?: number;
  min?: number;
  onChange: (v: number) => void;
  testId?: string;
}

function NumInput({ value, step = 0.1, min, onChange, testId }: NumInputProps) {
  return (
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      onChange={(e) => onChange(Number(e.target.value))}
      data-testid={testId}
      className="slider-num"
      style={{ width: '100%' }}
    />
  );
}

export function BoardEditorPanel() {
  const board = useProjectStore((s) => s.project.board);
  const cloneForEditing = useProjectStore((s) => s.cloneBoardForEditing);
  const patchPcb = useProjectStore((s) => s.patchBoardPcb);
  const addHole = useProjectStore((s) => s.addMountingHole);
  const removeHole = useProjectStore((s) => s.removeMountingHole);
  const patchHole = useProjectStore((s) => s.patchMountingHole);
  const addComponent = useProjectStore((s) => s.addComponent);
  const removeComponent = useProjectStore((s) => s.removeComponent);
  const patchComponent = useProjectStore((s) => s.patchComponent);

  if (board.builtin) {
    return (
      <div className="panel">
        <h3>Board editor</h3>
        <p className="board-meta">
          Built-in profiles are read-only. Clone to a custom copy to edit dimensions and mounting holes.
        </p>
        <button onClick={cloneForEditing} data-testid="clone-board">
          Clone &amp; edit
        </button>
      </div>
    );
  }

  return (
    <div className="panel">
      <h3>Board editor (custom)</h3>
      <div className="pcb-grid">
        <label>
          PCB X (mm)
          <NumInput
            value={board.pcb.size.x}
            onChange={(v) => patchPcb({ x: v })}
            testId="pcb-x"
          />
        </label>
        <label>
          PCB Y (mm)
          <NumInput
            value={board.pcb.size.y}
            onChange={(v) => patchPcb({ y: v })}
            testId="pcb-y"
          />
        </label>
        <label>
          PCB Z (mm)
          <NumInput
            value={board.pcb.size.z}
            onChange={(v) => patchPcb({ z: v })}
            testId="pcb-z"
          />
        </label>
      </div>
      <h4 className="subhead">
        Mounting holes
        <button
          onClick={addHole}
          data-testid="add-hole"
          style={{ marginLeft: 8, fontSize: 11 }}
        >
          + add
        </button>
      </h4>
      <table className="hole-table">
        <thead>
          <tr>
            <th>x</th>
            <th>y</th>
            <th>⌀</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {board.mountingHoles.map((h) => (
            <tr key={h.id}>
              <td>
                <NumInput
                  value={h.x}
                  onChange={(v) => patchHole(h.id, { x: v })}
                  testId={`hole-${h.id}-x`}
                />
              </td>
              <td>
                <NumInput
                  value={h.y}
                  onChange={(v) => patchHole(h.id, { y: v })}
                  testId={`hole-${h.id}-y`}
                />
              </td>
              <td>
                <NumInput
                  value={h.diameter}
                  onChange={(v) => patchHole(h.id, { diameter: v })}
                  testId={`hole-${h.id}-d`}
                />
              </td>
              <td>
                <button
                  onClick={() => removeHole(h.id)}
                  data-testid={`remove-hole-${h.id}`}
                  title="Remove"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h4 className="subhead">
        Components
        <button
          onClick={addComponent}
          data-testid="add-component"
          style={{ marginLeft: 8, fontSize: 11 }}
        >
          + add
        </button>
      </h4>
      <table className="hole-table">
        <thead>
          <tr>
            <th>kind</th>
            <th>face</th>
            <th>pos</th>
            <th>size</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {board.components.map((c) => (
            <tr key={c.id}>
              <td>
                <select
                  value={c.kind}
                  onChange={(e) =>
                    patchComponent(c.id, { kind: e.target.value as ComponentKind })
                  }
                  data-testid={`component-${c.id}-kind`}
                  style={{ width: '100%' }}
                >
                  {KIND_OPTIONS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  value={c.facing ?? '+y'}
                  onChange={(e) =>
                    patchComponent(c.id, { facing: e.target.value as Facing })
                  }
                  data-testid={`component-${c.id}-facing`}
                  style={{ width: '100%' }}
                >
                  {FACING_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </td>
              <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                {c.position.x.toFixed(1)},{c.position.y.toFixed(1)},{c.position.z.toFixed(1)}
              </td>
              <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                {c.size.x.toFixed(1)}×{c.size.y.toFixed(1)}×{c.size.z.toFixed(1)}
              </td>
              <td>
                <button
                  onClick={() => removeComponent(c.id)}
                  data-testid={`remove-component-${c.id}`}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
