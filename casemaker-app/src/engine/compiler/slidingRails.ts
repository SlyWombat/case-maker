import type { CaseParameters, BoardProfile } from '@/types';
import { cube, translate, type BuildOp } from './buildPlan';
import { computeShellDims } from './caseShell';

const RAIL_INSET_FROM_TOP = 0.5;
const RAIL_PROTRUSION = 1.5;
const RAIL_THICKNESS = 1.5;

export function buildSlidingRails(board: BoardProfile, params: CaseParameters): BuildOp[] {
  const dims = computeShellDims(board, params);
  const { wallThickness: wall, internalClearance: cl, floorThickness: floor, lidThickness: lid } = params;
  // Rails sit inside the cavity on the +y and -y inner walls, just below the rim.
  const railZ = floor + dims.cavityZ - lid - RAIL_INSET_FROM_TOP - RAIL_THICKNESS;
  const railX = wall;
  const xLen = dims.cavityX;
  const railSize: [number, number, number] = [xLen, RAIL_PROTRUSION, RAIL_THICKNESS];
  const railLow = translate([railX, wall + cl, railZ], cube(railSize, false));
  const railHigh = translate(
    [railX, wall + cl + dims.cavityY - RAIL_PROTRUSION, railZ],
    cube(railSize, false),
  );
  return [railLow, railHigh];
}
