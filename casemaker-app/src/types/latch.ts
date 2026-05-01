import type { Mm } from './units';

/** Issue #109 — Pelican-style spring-cam locking latch.
 *
 *  A latch is two parts:
 *    - STRIKER on the case wall (additive geometry, fused with shell)
 *    - CAM ARM on the lid (separate top-level BuildNode — printable as a
 *      free part with a print-in-place hinge knuckle interlocking with
 *      a paired knuckle on the lid edge).
 *
 *  Closing the lid drops the cam arm hook over the striker. Rotating the
 *  arm DOWN past the over-center point pulls the lid down by `throw` mm,
 *  compressing the gasket against the rim.
 */
export interface Latch {
  id: string;
  /** Which side wall the latch lives on. */
  wall: '+x' | '-x' | '+y' | '-y';
  /** Position along the wall, 0 = wall start. */
  uPosition: Mm;
  enabled: boolean;
  /** Pull-down distance the cam delivers between engagement and over-center. 1.0–3.0 mm typical. */
  throw: Mm;
  /** Arm width (parallel to the wall). */
  width: Mm;
  /** Arm length (vertical). */
  height: Mm;
}

export type LatchPreset = 'pelican-mini' | 'pelican-standard' | 'nanuk-style';

export const LATCH_DEFAULTS = {
  throw: 1.5,
  width: 14,
  height: 30,
} as const;
