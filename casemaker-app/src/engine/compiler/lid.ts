import type { CaseParameters, BoardProfile } from '@/types';
import { cube, difference, translate, union, type BuildOp } from './buildPlan';
import { computeShellDims } from './caseShell';

const SNAP_FRICTION = 0.2;
const SNAP_LIP_DEPTH = 4;
const SLIDING_END_INSET = 2; // each end shortened by this

export interface LidDims {
  x: number;
  y: number;
  z: number;
  zPosition: number;
  liftAboveShell: number;
}

export function computeLidDims(board: BoardProfile, params: CaseParameters): LidDims {
  const dims = computeShellDims(board, params);
  return {
    x: dims.outerX,
    y: dims.outerY,
    z: params.lidThickness,
    zPosition: dims.outerZ,
    liftAboveShell: 2,
  };
}

export function buildFlatLid(board: BoardProfile, params: CaseParameters): BuildOp {
  const lid = computeLidDims(board, params);
  return cube([lid.x, lid.y, lid.z], false);
}

export function buildSnapFitLid(board: BoardProfile, params: CaseParameters): BuildOp {
  const dims = computeShellDims(board, params);
  const { wallThickness: wall, internalClearance: cl, lidThickness: lid } = params;
  const lipOuterX = dims.cavityX - 2 * SNAP_FRICTION;
  const lipOuterY = dims.cavityY - 2 * SNAP_FRICTION;
  const lipWall = Math.max(0.8, wall - 0.6);
  const lipInnerX = lipOuterX - 2 * lipWall;
  const lipInnerY = lipOuterY - 2 * lipWall;

  const topPlate = cube([dims.outerX, dims.outerY, lid], false);
  // Build the lip ring: outer minus inner, extending downward from z=0 to z=-LIP_DEPTH.
  // Local frame matches the top plate's corner at (0,0,0).
  const lipOriginX = wall + cl + SNAP_FRICTION;
  const lipOriginY = wall + cl + SNAP_FRICTION;
  const lipOuter = translate(
    [lipOriginX, lipOriginY, -SNAP_LIP_DEPTH],
    cube([lipOuterX, lipOuterY, SNAP_LIP_DEPTH], false),
  );
  const lipInner = translate(
    [lipOriginX + lipWall, lipOriginY + lipWall, -SNAP_LIP_DEPTH - 0.5],
    cube([lipInnerX, lipInnerY, SNAP_LIP_DEPTH + 1], false),
  );
  const lipRing = difference([lipOuter, lipInner]);
  return union([topPlate, lipRing]);
}

export function buildSlidingLid(board: BoardProfile, params: CaseParameters): BuildOp {
  const dims = computeShellDims(board, params);
  const { lidThickness: lid } = params;
  const slidX = dims.outerX;
  const slidY = dims.outerY - 2 * SLIDING_END_INSET;
  const baseY = SLIDING_END_INSET;
  return translate([0, baseY, 0], cube([slidX, slidY, lid], false));
}

export function buildLid(board: BoardProfile, params: CaseParameters): BuildOp {
  switch (params.joint) {
    case 'snap-fit':
      return buildSnapFitLid(board, params);
    case 'sliding':
      return buildSlidingLid(board, params);
    case 'flat-lid':
    case 'screw-down':
    default:
      return buildFlatLid(board, params);
  }
}
