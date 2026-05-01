import type {
  BoardProfile,
  CaseParameters,
  HatPlacement,
  HatProfile,
} from '@/types';
import type { DisplayPlacement, DisplayProfile } from '@/types/display';
import { cube, cylinder, translate, type BuildOp } from './buildPlan';
import { computeShellDims } from './caseShell';

type HatResolver = (id: string) => HatProfile | undefined;
const NO_HATS: HatPlacement[] = [];
const NO_RESOLVE: HatResolver = () => undefined;
type DisplayResolver = (id: string) => DisplayProfile | undefined;
const NO_RESOLVE_DISPLAY: DisplayResolver = () => undefined;

/** Issue #111 — rugged exterior options. Three independent treatments:
 *
 *  1. Corner bumpers: vertical-axis cylinders at each external corner,
 *     extending past the case envelope by `radius - cornerRadius`.
 *     `flexBumper: true` emits them as separate top-level nodes so the
 *     user prints them in TPU and slips them on; otherwise fused with
 *     the case body.
 *
 *  2. Wall ribbing: rectangular ribs running vertically (along Z) or
 *     horizontally (along the wall tangent) on each side wall. Whity-
 *     style refinement: ribs leave a smooth `clearBand` mm band at top
 *     AND bottom for cleaner aesthetics.
 *
 *  3. Integrated feet: cylindrical pads at the case bottom corners.
 */

export interface RuggedOps {
  /** Geometry fused with the case body (rigid). */
  caseAdditive: BuildOp[];
  /** Separate top-level nodes (printed in TPU) for slip-on flex bumpers. */
  bumperNodes: { id: string; op: BuildOp }[];
}

export function buildRuggedOps(
  board: BoardProfile,
  params: CaseParameters,
  hats: HatPlacement[] = NO_HATS,
  resolveHat: HatResolver = NO_RESOLVE,
  display: DisplayPlacement | null | undefined = null,
  resolveDisplay: DisplayResolver = NO_RESOLVE_DISPLAY,
): RuggedOps {
  const empty: RuggedOps = { caseAdditive: [], bumperNodes: [] };
  if (!params.rugged?.enabled) return empty;
  const dims = computeShellDims(board, params, hats, resolveHat, display, resolveDisplay);
  const caseAdditive: BuildOp[] = [];
  const bumperNodes: { id: string; op: BuildOp }[] = [];

  if (params.rugged.corners.enabled) {
    const c = buildCornerBumpers(dims, params);
    if (params.rugged.corners.flexBumper) {
      // Each bumper becomes a separate top-level node.
      c.forEach((op, i) => {
        bumperNodes.push({ id: `bumper-${i}`, op });
      });
    } else {
      caseAdditive.push(...c);
    }
  }

  if (params.rugged.ribbing.enabled) {
    caseAdditive.push(...buildWallRibs(dims, params));
  }

  if (params.rugged.feet.enabled) {
    caseAdditive.push(...buildIntegratedFeet(dims, params));
  }

  return { caseAdditive, bumperNodes };
}

function buildCornerBumpers(
  dims: { outerX: number; outerY: number; outerZ: number },
  params: CaseParameters,
): BuildOp[] {
  const corners = params.rugged!.corners;
  const r = Math.max(0, corners.radius);
  if (r <= 0) return [];
  // Each bumper is a vertical cylinder at the case corner, full case height,
  // extending radially past the case envelope by (radius - existing cornerRadius).
  // For v1 we use FULL cylinders (not just the quarter past the envelope) and
  // let manifold's union with the shell do the trimming. cylinder() default
  // axis is +Z which matches the vertical orientation.
  const positions: [number, number][] = [
    [0, 0],
    [dims.outerX, 0],
    [0, dims.outerY],
    [dims.outerX, dims.outerY],
  ];
  return positions.map(([x, y]) => translate([x, y, 0], cylinder(dims.outerZ, r, 24)));
}

function buildWallRibs(
  dims: { outerX: number; outerY: number; outerZ: number },
  params: CaseParameters,
): BuildOp[] {
  const ribbing = params.rugged!.ribbing;
  if (ribbing.ribCount <= 0) return [];
  const out: BuildOp[] = [];
  const clear = Math.max(0, ribbing.clearBand);
  const ribZTop = dims.outerZ - clear;
  const ribZBottom = clear;
  const ribZSpan = ribZTop - ribZBottom;
  if (ribZSpan <= 1) return [];
  const wallThickness = ribbing.ribDepth;

  if (ribbing.direction === 'vertical') {
    // Vertical ribs on each side wall (±x and ±y). Distributed along the
    // wall's tangent axis; each rib is a thin cube extending OUTWARD from
    // the wall by ribDepth.
    const RIB_W = 2;
    for (const wall of ['+x', '-x', '+y', '-y'] as const) {
      const tangent = wall === '+x' || wall === '-x' ? dims.outerY : dims.outerX;
      const stride = tangent / (ribbing.ribCount + 1);
      for (let i = 1; i <= ribbing.ribCount; i++) {
        const t = i * stride;
        const ribCube = cube([RIB_W, wallThickness, ribZSpan], false);
        let placed: BuildOp;
        if (wall === '+x') {
          placed = translate([dims.outerX, t - RIB_W / 2, ribZBottom], ribCube);
        } else if (wall === '-x') {
          placed = translate([-wallThickness, t - RIB_W / 2, ribZBottom], ribCube);
        } else if (wall === '+y') {
          placed = translate([t - RIB_W / 2, dims.outerY, ribZBottom], cube([RIB_W, wallThickness, ribZSpan], false));
        } else {
          placed = translate([t - RIB_W / 2, -wallThickness, ribZBottom], cube([RIB_W, wallThickness, ribZSpan], false));
        }
        out.push(placed);
      }
    }
  } else {
    // Horizontal ribs — run along each wall's tangent. ribCount horizontal
    // bands distributed along Z within [ribZBottom, ribZTop]. Each rib
    // wraps the perimeter (4 cube segments).
    const RIB_H = 2;
    const stride = ribZSpan / (ribbing.ribCount + 1);
    for (let i = 1; i <= ribbing.ribCount; i++) {
      const z = ribZBottom + i * stride;
      // +x wall
      out.push(translate([dims.outerX, 0, z - RIB_H / 2], cube([wallThickness, dims.outerY, RIB_H], false)));
      // -x wall
      out.push(translate([-wallThickness, 0, z - RIB_H / 2], cube([wallThickness, dims.outerY, RIB_H], false)));
      // +y wall
      out.push(translate([0, dims.outerY, z - RIB_H / 2], cube([dims.outerX, wallThickness, RIB_H], false)));
      // -y wall
      out.push(translate([0, -wallThickness, z - RIB_H / 2], cube([dims.outerX, wallThickness, RIB_H], false)));
    }
  }
  return out;
}

function buildIntegratedFeet(
  dims: { outerX: number; outerY: number; outerZ: number },
  params: CaseParameters,
): BuildOp[] {
  const feet = params.rugged!.feet;
  const r = feet.padDiameter / 2;
  // Pads sit at the case bottom (z = -padHeight to z = 0, fused with floor).
  const pads4: [number, number][] = [
    [r + 1, r + 1],
    [dims.outerX - r - 1, r + 1],
    [r + 1, dims.outerY - r - 1],
    [dims.outerX - r - 1, dims.outerY - r - 1],
  ];
  const pads6: [number, number][] = [
    ...pads4,
    [dims.outerX / 2, r + 1],
    [dims.outerX / 2, dims.outerY - r - 1],
  ];
  const positions = feet.pads === 6 ? pads6 : pads4;
  return positions.map(([x, y]) =>
    translate([x, y, -feet.padHeight], cylinder(feet.padHeight, r, 24)),
  );
}
