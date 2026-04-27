import { describe, it, expect } from 'vitest';
import { resolveInsertSpec, computeBossPlacements } from '@/engine/compiler/bosses';
import { createDefaultProject } from '@/store/projectStore';

describe('boss insert variants', () => {
  it('self-tap honors the user-configured hole diameter', () => {
    const r = resolveInsertSpec('self-tap', 5, 2.5);
    expect(r.holeDiameter).toBe(2.5);
    expect(r.outerDiameter).toBeGreaterThanOrEqual(4.5);
  });

  it('heat-set-m2.5 forces a 3.6mm hole regardless of user config', () => {
    const r = resolveInsertSpec('heat-set-m2.5', 5, 2.5);
    expect(r.holeDiameter).toBe(3.6);
    expect(r.outerDiameter).toBeGreaterThanOrEqual(5.6);
  });

  it('heat-set-m3 forces a 4.2mm hole', () => {
    const r = resolveInsertSpec('heat-set-m3', 5, 2.5);
    expect(r.holeDiameter).toBe(4.2);
    expect(r.outerDiameter).toBeGreaterThanOrEqual(6.2);
  });

  it('outer diameter always provides at least 1mm wall around the hole', () => {
    const r = resolveInsertSpec('heat-set-m3', 4, 2);
    expect(r.outerDiameter - r.holeDiameter).toBeGreaterThanOrEqual(2 - 0.0001);
  });

  it('boss placements use the resolved diameters', () => {
    const project = createDefaultProject('rpi-4b');
    project.case.bosses.insertType = 'heat-set-m3';
    const placements = computeBossPlacements(project.board, project.case);
    expect(placements.every((b) => b.holeDiameter === 4.2)).toBe(true);
  });
});
