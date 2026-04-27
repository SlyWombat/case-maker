import type { CaseParameters, BoardProfile } from '@/types';
import { cube, cylinder, difference, translate, union, type BuildOp } from './buildPlan';
import { computeShellDims } from './caseShell';
import { computeBossPlacements, getScrewClearanceDiameter } from './bosses';

const LID_POST_BOARD_CLEARANCE = 0.3;

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

/**
 * Build the lid posts that clamp the board from above. Used by every joint type
 * (issue #27): a flat-lid case still needs the posts to retain the board, the
 * only difference is whether the post carries a screw clearance hole.
 */
function buildLidPosts(
  board: BoardProfile,
  params: CaseParameters,
): { posts: BuildOp[]; holes: BuildOp[]; postLength: number } {
  const dims = computeShellDims(board, params);
  const placements = computeBossPlacements(board, params);
  const standoff = board.defaultStandoffHeight;
  const boardTopWorld = params.floorThickness + standoff + board.pcb.size.z;
  const lidBottomWorld = dims.outerZ;
  const postLength = Math.max(0, lidBottomWorld - boardTopWorld - LID_POST_BOARD_CLEARANCE);
  if (postLength <= 0 || placements.length === 0) {
    return { posts: [], holes: [], postLength };
  }
  const screwDia =
    params.joint === 'screw-down'
      ? getScrewClearanceDiameter(params.bosses.insertType)
      : 0;
  const posts: BuildOp[] = placements.map((b) =>
    translate([b.x, b.y, -postLength], cylinder(postLength, b.outerDiameter / 2, 32)),
  );
  const holes: BuildOp[] =
    screwDia > 0
      ? placements.map((b) => {
          const totalH = params.lidThickness + postLength + 1;
          return translate(
            [b.x, b.y, -postLength - 0.5],
            cylinder(totalH, screwDia / 2, 24),
          );
        })
      : [];
  return { posts, holes, postLength };
}

function attachPosts(plate: BuildOp, posts: BuildOp[], holes: BuildOp[]): BuildOp {
  if (posts.length === 0) return plate;
  const solid = union([plate, ...posts]);
  return holes.length > 0 ? difference([solid, ...holes]) : solid;
}

export function buildFlatLid(board: BoardProfile, params: CaseParameters): BuildOp {
  const lid = computeLidDims(board, params);
  const plate = cube([lid.x, lid.y, lid.z], false);
  const { posts, holes } = buildLidPosts(board, params);
  return attachPosts(plate, posts, holes);
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
  const { posts, holes } = buildLidPosts(board, params);
  const withPosts = posts.length > 0 ? union([topPlate, lipRing, ...posts]) : union([topPlate, lipRing]);
  return holes.length > 0 ? difference([withPosts, ...holes]) : withPosts;
}

export function buildSlidingLid(board: BoardProfile, params: CaseParameters): BuildOp {
  const dims = computeShellDims(board, params);
  const { lidThickness: lid } = params;
  const slidX = dims.outerX;
  const slidY = dims.outerY - 2 * SLIDING_END_INSET;
  const baseY = SLIDING_END_INSET;
  const plate = translate([0, baseY, 0], cube([slidX, slidY, lid], false));
  const { posts, holes } = buildLidPosts(board, params);
  return attachPosts(plate, posts, holes);
}

export function buildScrewDownLid(board: BoardProfile, params: CaseParameters): BuildOp {
  const dims = computeShellDims(board, params);
  const plate = cube([dims.outerX, dims.outerY, params.lidThickness], false);
  const { posts, holes } = buildLidPosts(board, params);
  return attachPosts(plate, posts, holes);
}

export function buildLid(board: BoardProfile, params: CaseParameters): BuildOp {
  switch (params.joint) {
    case 'snap-fit':
      return buildSnapFitLid(board, params);
    case 'sliding':
      return buildSlidingLid(board, params);
    case 'screw-down':
      return buildScrewDownLid(board, params);
    case 'flat-lid':
    default:
      return buildFlatLid(board, params);
  }
}
