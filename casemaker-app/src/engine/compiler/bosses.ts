import type { CaseParameters, BoardProfile, InsertType } from '@/types';
import { cylinder, difference, translate, type BuildOp } from './buildPlan';

export interface BossPlacement {
  id: string;
  x: number;
  y: number;
  outerDiameter: number;
  holeDiameter: number;
  totalHeight: number;
}

const HEAT_SET_SPECS: Record<InsertType, { hole: number; minOuter: number }> = {
  'self-tap': { hole: 2.5, minOuter: 4.5 },
  'heat-set-m2.5': { hole: 3.6, minOuter: 5.6 },
  'heat-set-m3': { hole: 4.2, minOuter: 6.2 },
  'pass-through': { hole: 3.2, minOuter: 5 },
  none: { hole: 0, minOuter: 4.5 },
};

export function resolveInsertSpec(
  insertType: InsertType,
  configuredOuter: number,
  configuredHole: number,
): { outerDiameter: number; holeDiameter: number } {
  const spec = HEAT_SET_SPECS[insertType];
  // For self-tap and pass-through, honor user override of holeDiameter.
  // For heat-set, force the spec hole (the brass insert size is fixed).
  // For 'none' (issue #27), force hole=0 — the boss is a solid retention peg.
  const isHeatSet = insertType === 'heat-set-m2.5' || insertType === 'heat-set-m3';
  const holeDiameter =
    insertType === 'none' ? 0 : isHeatSet ? spec.hole : configuredHole;
  // Outer diameter must allow at least 1mm wall around the hole.
  const minOuter = Math.max(spec.minOuter, holeDiameter + 2);
  const outerDiameter = Math.max(configuredOuter, minOuter);
  return { outerDiameter, holeDiameter };
}

export function computeBossPlacements(
  board: BoardProfile,
  params: CaseParameters,
): BossPlacement[] {
  if (!params.bosses.enabled) return [];
  const { wallThickness: wall, internalClearance: cl, floorThickness: floor } = params;
  const standoff = board.defaultStandoffHeight;
  // All joint types use floor + standoff. For screw-down, the lid carries
  // matching posts that descend from above to clamp the board (issue #21).
  // For non-screw-down joints, the floor bosses become solid pegs (no pilot
  // hole) — issue #27. The user's configured insertType is preserved so it
  // resurfaces when they switch back to screw-down.
  const totalHeight = floor + standoff;
  const effectiveInsertType: InsertType =
    params.joint === 'screw-down' ? params.bosses.insertType : 'none';
  const { outerDiameter, holeDiameter } = resolveInsertSpec(
    effectiveInsertType,
    params.bosses.outerDiameter,
    params.bosses.holeDiameter,
  );
  return board.mountingHoles.map((h) => ({
    id: `boss-${h.id}`,
    x: h.x + wall + cl,
    y: h.y + wall + cl,
    outerDiameter,
    holeDiameter,
    totalHeight,
  }));
}

export function getScrewClearanceDiameter(insertType: InsertType): number {
  switch (insertType) {
    case 'heat-set-m3':
      return 3.4;
    case 'heat-set-m2.5':
    case 'self-tap':
      return 2.9;
    case 'pass-through':
      return 3.4;
    case 'none':
      return 0;
    default:
      return 2.9;
  }
}

export function buildBossesUnion(placements: BossPlacement[]): BuildOp[] {
  return placements.map((b) => {
    const outer = cylinder(b.totalHeight, b.outerDiameter / 2, 32);
    if (b.holeDiameter <= 0) {
      return translate([b.x, b.y, 0], outer);
    }
    const pilot = cylinder(b.totalHeight + 2, b.holeDiameter / 2, 24);
    const piloted = difference([outer, translate([0, 0, -1], pilot)]);
    return translate([b.x, b.y, 0], piloted);
  });
}
