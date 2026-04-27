import { describe, it, expect, beforeEach } from 'vitest';
import {
  getBuiltinDisplay,
  listBuiltinDisplayIds,
  displaysCompatibleWith,
} from '@/library/displays';
import { builtinDisplayProfileSchema } from '@/library/displaySchema';
import { computeDisplayFootprint, buildDisplayCutoutOps } from '@/engine/compiler/displays';
import { compileProject } from '@/engine/compiler/ProjectCompiler';
import { useProjectStore, createDefaultProject } from '@/store/projectStore';

describe('display mounting (#8 Phase 9a)', () => {
  beforeEach(() => {
    useProjectStore.getState().setProject(createDefaultProject('rpi-4b'));
  });

  it('library exposes the Pi 7" Touch and HyperPixel 4 as built-ins', () => {
    const ids = listBuiltinDisplayIds();
    expect(ids).toContain('rpi-7-touch');
    expect(ids).toContain('hyperpixel-4');
  });

  it('strict schema rejects a built-in display without a source URL', () => {
    const display = getBuiltinDisplay('rpi-7-touch')!;
    const broken = { ...display, source: undefined };
    expect(() => builtinDisplayProfileSchema.parse(broken)).toThrow();
  });

  it('displaysCompatibleWith filters by board id', () => {
    const piHats = displaysCompatibleWith('rpi-4b');
    expect(piHats.map((d) => d.id)).toContain('hyperpixel-4');
    const arduino = displaysCompatibleWith('arduino-uno-r3');
    expect(arduino.map((d) => d.id)).not.toContain('hyperpixel-4');
  });

  it('Pi 7" Touch is much larger than the Pi 4B → footprint grows', () => {
    useProjectStore.getState().setDisplay('rpi-7-touch', 'top-window');
    const project = useProjectStore.getState().project;
    const footprint = computeDisplayFootprint(
      project.board,
      project.display ?? undefined,
      (id) => getBuiltinDisplay(id),
    );
    expect(footprint.effectiveX).toBeGreaterThan(project.board.pcb.size.x);
    expect(footprint.effectiveY).toBeGreaterThan(project.board.pcb.size.y);
  });

  it('top-window framing produces a single window cutout op', () => {
    useProjectStore.getState().setDisplay('hyperpixel-4', 'top-window');
    const project = useProjectStore.getState().project;
    const ops = buildDisplayCutoutOps(
      project.board,
      project.case,
      project.display,
      (id) => getBuiltinDisplay(id),
    );
    expect(ops.subtractive.length).toBe(1);
  });

  it('recessed-bezel framing adds the pocket subtraction', () => {
    useProjectStore.getState().setDisplay('hyperpixel-4', 'recessed-bezel');
    const project = useProjectStore.getState().project;
    const ops = buildDisplayCutoutOps(
      project.board,
      project.case,
      project.display,
      (id) => getBuiltinDisplay(id),
    );
    expect(ops.subtractive.length).toBeGreaterThanOrEqual(2);
  });

  it('compileProject works end-to-end with a display set', () => {
    useProjectStore.getState().setDisplay('hyperpixel-4', 'top-window');
    const plan = compileProject(useProjectStore.getState().project);
    expect(plan.nodes.map((n) => n.id)).toEqual(['shell', 'lid']);
  });

  it('setDisplay(null) clears the placement', () => {
    useProjectStore.getState().setDisplay('hyperpixel-4', 'top-window');
    useProjectStore.getState().setDisplay(null);
    expect(useProjectStore.getState().project.display).toBeNull();
  });
});
