// Issue #75 — multi-surface ventilation. Default (legacy) projects with no
// `surfaces` field render identically to today (back wall only). Selecting
// multiple surfaces produces strictly more cutouts.

import { describe, it, expect } from 'vitest';
import { buildVentilationCutouts } from '@/engine/compiler/ventilation';
import { createDefaultProject } from '@/store/projectStore';

describe('Multi-surface ventilation (#75)', () => {
  const baseProject = createDefaultProject('rpi-4b');
  baseProject.case.ventilation = {
    enabled: true,
    pattern: 'slots',
    coverage: 0.5,
  };

  it('legacy project (no surfaces field) defaults to back wall only', () => {
    const ops = buildVentilationCutouts(baseProject.board, baseProject.case);
    expect(ops.length).toBeGreaterThan(0);
  });

  it('explicit surfaces=["back"] matches legacy output count', () => {
    const legacy = buildVentilationCutouts(baseProject.board, baseProject.case);
    const explicit = buildVentilationCutouts(baseProject.board, {
      ...baseProject.case,
      ventilation: { ...baseProject.case.ventilation, surfaces: ['back'] },
    });
    expect(explicit.length).toBe(legacy.length);
  });

  it('top + bottom + back produces strictly more cutouts than back alone', () => {
    const single = buildVentilationCutouts(baseProject.board, {
      ...baseProject.case,
      ventilation: { ...baseProject.case.ventilation, surfaces: ['back'] },
    });
    const multi = buildVentilationCutouts(baseProject.board, {
      ...baseProject.case,
      ventilation: {
        ...baseProject.case.ventilation,
        surfaces: ['back', 'top', 'bottom'],
      },
    });
    expect(multi.length).toBeGreaterThan(single.length);
  });

  it('all six surfaces selected produces ~6× the cutouts of one surface', () => {
    const single = buildVentilationCutouts(baseProject.board, {
      ...baseProject.case,
      ventilation: { ...baseProject.case.ventilation, surfaces: ['back'] },
    });
    const all = buildVentilationCutouts(baseProject.board, {
      ...baseProject.case,
      ventilation: {
        ...baseProject.case.ventilation,
        surfaces: ['top', 'bottom', 'front', 'back', 'left', 'right'],
      },
    });
    // Top and bottom may have a different cell count than walls (different
    // u/v extents), so don't insist on exactly 6×; just that we're in the
    // right neighborhood.
    expect(all.length).toBeGreaterThanOrEqual(single.length * 4);
  });

  it('hex pattern multi-surface also produces more cutouts than single', () => {
    const baseCase = {
      ...baseProject.case,
      ventilation: {
        ...baseProject.case.ventilation,
        pattern: 'hex' as const,
      },
    };
    const single = buildVentilationCutouts(baseProject.board, {
      ...baseCase,
      ventilation: { ...baseCase.ventilation, surfaces: ['back'] },
    });
    const multi = buildVentilationCutouts(baseProject.board, {
      ...baseCase,
      ventilation: {
        ...baseCase.ventilation,
        surfaces: ['back', 'left', 'right'],
      },
    });
    expect(multi.length).toBeGreaterThan(single.length);
  });

  it('empty surfaces array also defaults to back wall (defensive)', () => {
    const ops = buildVentilationCutouts(baseProject.board, {
      ...baseProject.case,
      ventilation: { ...baseProject.case.ventilation, surfaces: [] },
    });
    expect(ops.length).toBeGreaterThan(0);
  });
});
