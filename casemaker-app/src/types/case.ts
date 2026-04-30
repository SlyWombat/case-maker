import type { Mm } from './units';
import type { SnapCatch } from './snap';

/**
 * The six faces of an axis-aligned box-shaped case.
 *
 * Issue #50 — single canonical definition. Previously duplicated across
 * `fan.ts`, `mounting.ts`, `textLabel.ts`; those modules now re-export this
 * type so existing import paths keep working.
 */
export type CaseFace = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';

export type JointType = 'snap-fit' | 'screw-down' | 'flat-lid';
/**
 * Issue #78 — only meaningful when joint === 'snap-fit'.
 *  - 'barb'   : discrete cantilever arms with inside-wall lips at each catch
 *               position. Lid is a flat plate. Print-friendly, easy to release.
 *  - 'full-lid': continuous lip ring around the entire perimeter — friction-fit
 *               between lid lip and cavity walls. Snap catches still optional.
 *               Tighter seal, harder to insert / remove.
 */
export type SnapType = 'barb' | 'full-lid';
export type InsertType =
  | 'self-tap'
  | 'heat-set-m2.5'
  | 'heat-set-m3'
  | 'pass-through'
  | 'none';
export type VentilationPattern = 'none' | 'slots' | 'hex';

export interface BossesParams {
  enabled: boolean;
  insertType: InsertType;
  outerDiameter: Mm;
  holeDiameter: Mm;
}

/** Issue #75 — surfaces the vent pattern can be cut into. Multi-select; the
 *  same pattern + coverage applies to every selected surface. */
export type VentSurface = 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right';

/** Issue #76 — six-face naming for custom cutouts. Same set of values as
 *  VentSurface; kept as a separate alias so each feature can evolve its
 *  schema independently. */
export type CutoutFace = VentSurface;
export type CustomCutoutShape = 'rect' | 'round' | 'slot';

/**
 * Issue #76 — user-defined freeform cutout that isn't tied to a board
 * component. Disabling auto-generated cutouts is still done via the port's
 * `enabled` toggle; this type is for adding NEW holes the auto-detection
 * couldn't supply (cable pass-throughs, antenna leads, mod cuts).
 */
export interface CustomCutout {
  id: string;
  face: CutoutFace;
  shape: CustomCutoutShape;
  /** Position on the face, in mm from the (uMin, vMin) corner of that face. */
  u: Mm;
  v: Mm;
  /** For rect / slot: width × height in (u, v). For round: diameter (uses width). */
  width: Mm;
  height: Mm;
  /** Optional rotation in the face plane (degrees, 0 = u-axis aligned). */
  rotationDeg?: number;
  enabled: boolean;
  /** User-facing label shown in the editor (e.g. "antenna pass-through"). */
  label?: string;
}

export const VENT_SURFACES: ReadonlyArray<VentSurface> = [
  'top',
  'bottom',
  'front',
  'back',
  'left',
  'right',
];

export interface VentilationParams {
  enabled: boolean;
  pattern: VentilationPattern;
  coverage: number;
  /** Issue #75 — defaults to ['back'] when absent so legacy projects render
   *  byte-identical to today (single +y wall). */
  surfaces?: VentSurface[];
}

export interface CaseParameters {
  wallThickness: Mm;
  floorThickness: Mm;
  lidThickness: Mm;
  cornerRadius: Mm;
  internalClearance: Mm;
  zClearance: Mm;
  joint: JointType;
  /** Recessed-lid mode: lid drops into a pocket at the top of the shell, flush with the rim. */
  lidRecess?: boolean;
  /**
   * Issue #36 — extra cavity height (mm) added on top of the auto-computed
   * minimum. Grows the wall and pushes the lid up; cutout positions are
   * unchanged so connectors stay aligned with their openings.
   */
  extraCavityZ?: Mm;
  ventilation: VentilationParams;
  bosses: BossesParams;
  /**
   * Optional cantilever snap-fit catches (issue #29). Only consulted when
   * joint === 'snap-fit'; auto-populated by createDefaultProject when the
   * joint is changed to snap-fit.
   */
  snapCatches?: SnapCatch[];
  /**
   * Issue #78 — pick the snap-fit lid style. Default 'barb' (discrete catches +
   * flat lid). 'full-lid' restores the continuous perimeter friction lip.
   * Only meaningful when joint === 'snap-fit'.
   */
  snapType?: SnapType;
  /**
   * Issue #76 — freeform cutouts placed by hand on any case face. Optional
   * so legacy projects load with no migration; missing field = empty list.
   */
  customCutouts?: CustomCutout[];
}
