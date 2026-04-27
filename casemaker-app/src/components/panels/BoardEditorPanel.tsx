import { useProjectStore } from '@/store/projectStore';

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
    </div>
  );
}
