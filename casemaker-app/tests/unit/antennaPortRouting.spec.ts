// Issue #100 — antenna-connector components are owned by the Antenna feature
// (the existing antennas.ts compiler). The auto-port path and the per-port
// cutout path must BOTH skip them so the case doesn't end up with two
// cutouts at the same position: a wrong-shaped rectangular port from the
// generic port pipeline plus the proper antenna hole from antennas.ts.

import { describe, it, expect } from 'vitest';
import { autoPortsForBoard } from '@/engine/compiler/portFactory';
import { buildPortCutoutOp } from '@/engine/compiler/ports';
import { createDefaultProject } from '@/store/projectStore';
import type { BoardProfile, PortPlacement } from '@/types';

describe('Antenna-connector port routing (#100)', () => {
  it('autoPortsForBoard skips antenna-connector components', () => {
    // Pi 5 has a U.FL antenna entry with facing +y in its catalog.
    const project = createDefaultProject('rpi-5');
    const ports = autoPortsForBoard(project.board);
    const antennaPorts = ports.filter((p) => p.kind === 'antenna-connector');
    expect(antennaPorts.length).toBe(0);
  });

  it('autoPortsForBoard still emits non-antenna ports (USB / HDMI / RJ45 still cut)', () => {
    const project = createDefaultProject('rpi-5');
    const ports = autoPortsForBoard(project.board);
    expect(ports.length).toBeGreaterThan(0);
    const kinds = new Set(ports.map((p) => p.kind));
    expect(kinds.size).toBeGreaterThanOrEqual(2);
  });

  it('buildPortCutoutOp returns null for antenna-connector kind even if a saved project still has one', () => {
    // Synthesize a port placement of kind antenna-connector that someone
    // might have saved before this fix landed. The compiler should ignore
    // it so existing project files heal automatically.
    const project = createDefaultProject('rpi-5');
    const port: PortPlacement = {
      id: 'legacy-antenna-port',
      sourceComponentId: 'wifi',
      kind: 'antenna-connector',
      position: { x: 50, y: 53, z: 1.6 },
      size: { x: 3, y: 3, z: 2 },
      facing: '+y',
      cutoutMargin: 0.4,
      locked: false,
      enabled: true,
    };
    const op = buildPortCutoutOp(port, project.board, project.case);
    expect(op).toBeNull();
  });

  it('default project for rpi-5 has an antenna feature instantiated (defaultAntennasForBoard wired in)', () => {
    const project = createDefaultProject('rpi-5');
    expect(project.antennas?.length ?? 0).toBeGreaterThan(0);
  });

  it('boards without antenna metadata are unaffected — pi-4b emits its full port set', () => {
    const project = createDefaultProject('rpi-4b');
    const ports = autoPortsForBoard(project.board);
    expect(ports.length).toBeGreaterThan(0);
    const board: BoardProfile = project.board;
    expect(board.components.some((c) => c.kind === 'antenna-connector')).toBe(false);
  });
});
