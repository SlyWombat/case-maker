import type { Latch } from '@/types';

/** Shared geometry between the latch hinge (`latches.ts`) and the protective
 *  ribs that flank each latch (`rugged.ts`). The ribs need to know where the
 *  hinge knuckles sit so they can bump out to match the knuckle profile, and
 *  the pin needs to extend through the corner-facing rib so the user can
 *  push it out with a paperclip from outside the case. */

// -- Per-latch protective rib layout ---------------------------------------
export const LATCH_RIB_GAP = 2;              // mm — distance from latch edge to rib center
export const LATCH_RIB_W = 3;                // mm — wall-tangent width of each protective rib
export const LATCH_RIB_BODY_DEPTH = 5;       // mm — outward protrusion ABOVE / BELOW the knuckle bump
export const LATCH_RIB_KNUCKLE_DEPTH = 9;    // mm — outward protrusion AT the hinge-knuckle Z
export const LATCH_RIB_KNUCKLE_PAD = 1.5;    // mm — Z padding above + below the knuckle envelope

// -- Latch hinge geometry that the rib needs to mirror ---------------------
// (kept in sync with latches.ts — both import from here so the constants
// don't drift.)
export const LATCH_PIVOT_BELOW_RIM = 22;     // mm — pin axis sits this far below the rim
export const LATCH_KNUCKLE_OUTER_R = 4;      // mm — outer radius of every hinge knuckle
export const LATCH_KNUCKLE_OFFSET = 4;       // mm — pin axis distance OUT from outer wall surface
export const LATCH_PIN_R = 1.5;              // mm — pin radius (3 mm diameter)

// -- Pin extension to pass THROUGH the corner-facing protective rib --------
//
// The pin has a CAP at its corner-facing end — a wider cylindrical head
// that sits in a counter-sink on the rib's outer face. When fully inserted
// the cap's outer face is flush with the rib's outer face (no protruding
// stub), and the wider head gives a thumbnail / paperclip something to
// grab when the user wants to remove it.
export const LATCH_PIN_HOLE_CLEAR = 0.4;        // mm — through-hole is wider than pin shaft by this much
export const LATCH_PIN_CAP_R = 2.5;             // mm — cap (head) radius (vs PIN_R = 1.5)
export const LATCH_PIN_CAP_LEN = 1.8;           // mm — cap tangent extent
export const LATCH_PIN_CAP_CLEAR_RADIAL = 0.3;  // mm — counter-sink radius minus cap radius
export const LATCH_PIN_CAP_CLEAR_AXIAL = 0.15;  // mm — counter-sink slightly deeper so the cap
                                                //      bottoms out fractionally inside the rib (visually flush)

/** Returns +1 if the latch's nearest corner is on the +tangent side of the
 *  wall midpoint, -1 if the -tangent side. The CORNER-facing protective rib
 *  is the one on this side; that's the rib that gets the pin removal hole. */
export function cornerSign(latch: Latch, dims: { outerX: number; outerY: number }): -1 | 1 {
  const tangentMax = (latch.wall === '+x' || latch.wall === '-x') ? dims.outerY : dims.outerX;
  return latch.uPosition < tangentMax / 2 ? -1 : +1;
}

/** Wall-tangent center positions of the two protective ribs flanking a
 *  latch. The "corner" rib is the one in `cornerSign(latch)` direction —
 *  closer to the case corner. The "inner" rib is opposite. */
export function protectiveRibPositions(
  latch: Latch,
  dims: { outerX: number; outerY: number },
): { innerCenter: number; cornerCenter: number; cornerSign: -1 | 1 } {
  const sCorner = cornerSign(latch, dims);
  const halfW = latch.width / 2;
  const offset = halfW + LATCH_RIB_GAP;
  return {
    innerCenter: latch.uPosition - sCorner * offset,
    cornerCenter: latch.uPosition + sCorner * offset,
    cornerSign: sCorner,
  };
}

/** Wall-tangent extent of the print-in-place pin SHAFT (excluding the
 *  cap). Asymmetric — short end on the inner side (just past the latch's
 *  case knuckles, captured), long end on the corner side terminating
 *  EXACTLY at the corner-facing protective rib's outer face. The cap
 *  occupies the outer (LATCH_PIN_CAP_LEN mm) of this same span — it
 *  sits in a counter-sink so its outer face ends up flush with the rib. */
export function pinSpanU(
  latch: Latch,
  dims: { outerX: number; outerY: number },
): { uMin: number; uMax: number } {
  const sCorner = cornerSign(latch, dims);
  const halfW = latch.width / 2;
  const cornerRibCenter = latch.uPosition + sCorner * (halfW + LATCH_RIB_GAP);
  const cornerRibOuter = cornerRibCenter + sCorner * (LATCH_RIB_W / 2);
  const innerEnd = latch.uPosition - sCorner * (halfW + 0.5);
  // Corner end: AT the rib outer face. The cap (separate, wider) sits in
  // the counter-sink and its outer face ends up flush with this same point.
  const cornerEnd = cornerRibOuter;
  return {
    uMin: Math.min(innerEnd, cornerEnd),
    uMax: Math.max(innerEnd, cornerEnd),
  };
}

/** Tangent extent of the pin CAP — the wider head that sits flush in the
 *  counter-sink. Returns null if cap geometry doesn't fit (e.g. degenerate
 *  pin span). */
export function pinCapSpanU(
  latch: Latch,
  dims: { outerX: number; outerY: number },
): { uMin: number; uMax: number; sCorner: -1 | 1 } | null {
  const sCorner = cornerSign(latch, dims);
  const halfW = latch.width / 2;
  const cornerRibCenter = latch.uPosition + sCorner * (halfW + LATCH_RIB_GAP);
  const cornerRibOuter = cornerRibCenter + sCorner * (LATCH_RIB_W / 2);
  const capInner = cornerRibOuter - sCorner * LATCH_PIN_CAP_LEN;
  return {
    uMin: Math.min(cornerRibOuter, capInner),
    uMax: Math.max(cornerRibOuter, capInner),
    sCorner,
  };
}
