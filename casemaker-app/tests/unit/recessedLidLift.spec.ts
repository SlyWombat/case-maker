import { describe, it, expect } from 'vitest';
import { computeLidDims } from '@/engine/compiler/lid';
import { createDefaultProject } from '@/store/projectStore';

describe('recessed lid exploded-view lift (#79)', () => {
  it('liftAboveShell is 2mm when lidRecess is off (default behavior)', () => {
    const project = createDefaultProject('rpi-4b');
    const dims = computeLidDims(project.board, { ...project.case, lidRecess: false });
    expect(dims.liftAboveShell).toBe(2);
  });

  it('liftAboveShell is 6mm when lidRecess is on so the recess shelf reads at default zoom', () => {
    const project = createDefaultProject('rpi-4b');
    const dims = computeLidDims(project.board, { ...project.case, lidRecess: true });
    expect(dims.liftAboveShell).toBe(6);
  });

  it('toggling lidRecess produces a different effective lid Z position', () => {
    const project = createDefaultProject('rpi-4b');
    const flat = computeLidDims(project.board, { ...project.case, lidRecess: false });
    const recessed = computeLidDims(project.board, { ...project.case, lidRecess: true });
    const flatZ = flat.zPosition + flat.liftAboveShell;
    const recessedZ = recessed.zPosition + recessed.liftAboveShell;
    expect(Math.abs(flatZ - recessedZ)).toBeGreaterThan(0);
  });
});
