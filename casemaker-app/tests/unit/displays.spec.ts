import { describe, it, expect, beforeEach } from 'vitest';
import {
  getBuiltinDisplay,
  listBuiltinDisplayIds,
  displaysCompatibleWith,
} from '@/library/displays';
import { builtinDisplayProfileSchema } from '@/library/displaySchema';
import { buildDisplayCutoutOps } from '@/engine/compiler/displays';
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

  // Issue #105 — display larger than host PCB grows the case envelope.
  // computeShellDims now takes optional `display` + `resolveDisplay`
  // params; when the display PCB exceeds the host's, the cavity grows.
  it('Pi 7" Touch on a Pi 4B grows the case cavity beyond host PCB (#105)', async () => {
    const { computeShellDims } = await import('@/engine/compiler/caseShell');
    useProjectStore.getState().setDisplay('rpi-7-touch', 'top-window');
    const project = useProjectStore.getState().project;
    const dimsHostOnly = computeShellDims(
      project.board,
      project.case,
      project.hats ?? [],
      () => undefined,
    );
    const dimsWithDisplay = computeShellDims(
      project.board,
      project.case,
      project.hats ?? [],
      () => undefined,
      project.display,
      (id) => getBuiltinDisplay(id),
    );
    expect(dimsWithDisplay.cavityX).toBeGreaterThan(dimsHostOnly.cavityX);
    expect(dimsWithDisplay.cavityY).toBeGreaterThan(dimsHostOnly.cavityY);
    expect(dimsWithDisplay.outerX).toBeGreaterThan(dimsHostOnly.outerX);
    expect(dimsWithDisplay.outerY).toBeGreaterThan(dimsHostOnly.outerY);
  });

  it('HyperPixel 4 on a Pi 4B does NOT grow the case (display ≤ host)', async () => {
    const { computeShellDims } = await import('@/engine/compiler/caseShell');
    useProjectStore.getState().setDisplay('hyperpixel-4', 'top-window');
    const project = useProjectStore.getState().project;
    const dimsWithDisplay = computeShellDims(
      project.board,
      project.case,
      project.hats ?? [],
      () => undefined,
      project.display,
      (id) => getBuiltinDisplay(id),
    );
    const dimsHostOnly = computeShellDims(
      project.board,
      project.case,
      project.hats ?? [],
      () => undefined,
    );
    // HyperPixel 4 is roughly the same size as a Pi 4B PCB, so X/Y don't grow.
    expect(dimsWithDisplay.cavityX).toBeCloseTo(dimsHostOnly.cavityX, 1);
    expect(dimsWithDisplay.cavityY).toBeCloseTo(dimsHostOnly.cavityY, 1);
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
