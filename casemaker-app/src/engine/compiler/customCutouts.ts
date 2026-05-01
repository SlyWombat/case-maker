import type {
  CaseParameters,
  BoardProfile,
  HatPlacement,
  HatProfile,
  CustomCutout,
  CutoutFace,
  CaseFace,
} from '@/types';
import type { DisplayPlacement, DisplayProfile } from '@/types/display';
import { cube, cylinder, rotate, translate, type BuildOp } from './buildPlan';
import { computeShellDims } from './caseShell';
import { faceFrame, placeOnFace } from '@/engine/coords';

type DisplayResolver = (id: string) => DisplayProfile | undefined;
const NO_RESOLVE_DISPLAY: DisplayResolver = () => undefined;

const CUTOUT_FACE_TO_CASE_FACE: Record<CutoutFace, CaseFace> = {
  top: '+z',
  bottom: '-z',
  back: '+y',
  front: '-y',
  right: '+x',
  left: '-x',
};

const OVER = 1; // overshoot on each side so the cutter punches cleanly through.

/**
 * Issue #76 — freeform user-placed cutouts. Each cutout becomes a single
 * subtractive op (rect/slot → cube; round → cylinder oriented along the
 * face normal). Reuses the centralized face-frame math from #50 so the
 * (u, v) → world transform stays consistent with mounting features and
 * fan mounts on the same face.
 */
export function buildCustomCutouts(
  cutouts: CustomCutout[] | undefined,
  board: BoardProfile,
  params: CaseParameters,
  hats: HatPlacement[] = [],
  resolveHat: (id: string) => HatProfile | undefined = () => undefined,
  display: DisplayPlacement | null | undefined = null,
  resolveDisplay: DisplayResolver = NO_RESOLVE_DISPLAY,
): BuildOp[] {
  if (!cutouts || cutouts.length === 0) return [];
  const dims = computeShellDims(board, params, hats, resolveHat, display, resolveDisplay);
  const out: BuildOp[] = [];
  for (const c of cutouts) {
    if (!c.enabled) continue;
    const op = buildOneCutout(c, dims, params);
    if (op) out.push(op);
  }
  return out;
}

function wallThicknessForFace(face: CutoutFace, params: CaseParameters): number {
  if (face === 'top') return params.lidThickness;
  if (face === 'bottom') return params.floorThickness;
  return params.wallThickness;
}

function buildOneCutout(
  cutout: CustomCutout,
  dims: { outerX: number; outerY: number; outerZ: number },
  params: CaseParameters,
): BuildOp | null {
  const caseFace = CUTOUT_FACE_TO_CASE_FACE[cutout.face];
  const frame = faceFrame(caseFace, dims.outerX, dims.outerY, dims.outerZ);
  const wall = wallThicknessForFace(cutout.face, params);
  const cutThru = wall + 2 * OVER;

  if (cutout.shape === 'round') {
    // Diameter from `width`. Build a Z-axis cylinder of length cutThru,
    // then rotate so its axis aligns with the face's outward normal.
    const radius = cutout.width / 2;
    const cyl = cylinder(cutThru, radius, 32);
    // Rotation: map +Z to ±X / ±Y / ±Z depending on outward axis.
    let oriented: BuildOp = cyl;
    if (frame.outwardLetter === 'x') {
      oriented = rotate([0, frame.outwardSign === 1 ? 90 : -90, 0], cyl);
    } else if (frame.outwardLetter === 'y') {
      oriented = rotate([-frame.outwardSign * 90, 0, 0], cyl);
    } else {
      // outwardLetter === 'z' — already aligned. For -z we still want to
      // extend through the floor; the cylinder body extends from z=0 to
      // z=cutThru in +Z. We compensate via the translate by starting -OVER
      // back from the face origin.
    }
    // Center on face surface, then push back by OVER along outward axis so
    // the cylinder enters from outside and pokes through.
    const center = placeOnFace(frame, cutout.u, cutout.v, -OVER);
    return translate(center, oriented);
  }

  // rect or slot: same primitive (cube). Slot is just a long-thin rect; the
  // shape distinction shows up in UI presets, not in the cut geometry.
  // Build a cube sized (width, height, cutThru) in face-local (u, v, n)
  // coords, then orient so the n-axis aligns with the face outward normal.
  const sx = frame.outwardLetter === 'x' ? cutThru : cutout.width;
  const sy = frame.outwardLetter === 'y' ? cutThru : (frame.outwardLetter === 'x' ? cutout.width : cutout.height);
  const sz = frame.outwardLetter === 'z' ? cutThru : cutout.height;
  // Determine which world component the (width, height) map to:
  //   ±z faces: width → x, height → y
  //   ±y faces: width → x, height → z
  //   ±x faces: width → y, height → z
  // The cube primitive builds at origin extending into +x/+y/+z, so we need
  // to position the cube's bbox-min corner relative to the cutout center.
  // Since the cutout is positioned by its CENTER (u, v), shift by half the
  // cube's in-plane size in u and v.
  const center = placeOnFace(frame, cutout.u, cutout.v, -OVER);
  const cornerOffset: [number, number, number] = (() => {
    if (frame.outwardLetter === 'x') return [0, -cutout.width / 2, -cutout.height / 2];
    if (frame.outwardLetter === 'y') return [-cutout.width / 2, 0, -cutout.height / 2];
    return [-cutout.width / 2, -cutout.height / 2, 0];
  })();
  const cubeOp = cube([sx, sy, sz], false);
  // Rotation in the face plane is currently a no-op for rect/slot — the cube
  // is axis-aligned with the face's u/v axes. A future enhancement could
  // accept rotationDeg and apply a face-plane rotation around the outward
  // axis; for now we ignore it (the cube is symmetric for slot if width≠height).
  void cutout.rotationDeg;
  return translate(
    [center[0] + cornerOffset[0], center[1] + cornerOffset[1], center[2] + cornerOffset[2]],
    cubeOp,
  );
}
