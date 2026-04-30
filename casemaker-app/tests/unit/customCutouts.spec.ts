import { describe, it, expect } from 'vitest';
import { buildCustomCutouts } from '@/engine/compiler/customCutouts';
import { compileProject } from '@/engine/compiler/ProjectCompiler';
import { createDefaultProject } from '@/store/projectStore';
import { parseProject, serializeProject } from '@/store/persistence';
import type { CustomCutout, CutoutFace, CustomCutoutShape } from '@/types';
import type { BuildOp } from '@/engine/compiler/buildPlan';

const FACES: CutoutFace[] = ['top', 'bottom', 'front', 'back', 'left', 'right'];
const SHAPES: CustomCutoutShape[] = ['rect', 'round', 'slot'];

function mkCutout(face: CutoutFace, shape: CustomCutoutShape, id = `c-${face}-${shape}`): CustomCutout {
  return {
    id,
    face,
    shape,
    u: 25,
    v: 15,
    width: shape === 'round' ? 8 : 10,
    height: shape === 'slot' ? 4 : 10,
    enabled: true,
  };
}

function countByKind(op: BuildOp, kind: BuildOp['kind']): number {
  let n = op.kind === kind ? 1 : 0;
  if ('child' in op && op.child) n += countByKind(op.child, kind);
  if ('children' in op) for (const c of op.children) n += countByKind(c, kind);
  return n;
}

describe('custom cutouts (#76)', () => {
  it('round/rect/slot on every face produce a non-empty subtractive op', () => {
    const project = createDefaultProject('rpi-4b');
    for (const face of FACES) {
      for (const shape of SHAPES) {
        const cutout = mkCutout(face, shape);
        const ops = buildCustomCutouts([cutout], project.board, project.case);
        expect(ops.length, `${face}/${shape} should produce one op`).toBe(1);
        // round → cylinder primitive somewhere; rect/slot → cube.
        const expected = shape === 'round' ? 'cylinder' : 'cube';
        expect(countByKind(ops[0]!, expected)).toBe(1);
      }
    }
  });

  it('disabled cutouts produce zero ops', () => {
    const project = createDefaultProject('rpi-4b');
    const cutout = { ...mkCutout('back', 'rect'), enabled: false };
    expect(buildCustomCutouts([cutout], project.board, project.case)).toEqual([]);
  });

  it('legacy projects without customCutouts compile cleanly', () => {
    const project = createDefaultProject('rpi-4b');
    delete project.case.customCutouts;
    expect(() => compileProject(project)).not.toThrow();
  });

  it('round-trips through parseProject / serializeProject', () => {
    const project = createDefaultProject('rpi-4b');
    project.case.customCutouts = [
      mkCutout('back', 'round', 'rt-1'),
      mkCutout('front', 'rect', 'rt-2'),
      { ...mkCutout('top', 'slot', 'rt-3'), label: 'cable pass-through' },
    ];
    const serialized = serializeProject(project);
    const parsed = parseProject(serialized);
    expect(parsed.case.customCutouts).toHaveLength(3);
    expect(parsed.case.customCutouts![0]).toMatchObject({ id: 'rt-1', face: 'back', shape: 'round' });
    expect(parsed.case.customCutouts![2]!.label).toBe('cable pass-through');
  });

  it('compileProject includes custom cutout ops in the shell difference', () => {
    const project = createDefaultProject('rpi-4b');
    const before = compileProject(project);
    project.case.customCutouts = [mkCutout('back', 'round', 'compile-test')];
    const after = compileProject(project);
    // Both should produce a shell node; the one with a cutout should have
    // strictly more 'difference' children (or another cutout's worth of
    // structure). We compare by counting cylinder primitives in the shell.
    const beforeCyl = countByKind(before.nodes[0]!.op, 'cylinder');
    const afterCyl = countByKind(after.nodes[0]!.op, 'cylinder');
    expect(afterCyl).toBeGreaterThan(beforeCyl);
  });
});
