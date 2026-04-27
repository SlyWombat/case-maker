import type { Mm } from './units';
import type { MountingHole, BoardComponent } from './board';

export type DisplayInterface = 'dsi' | 'hdmi' | 'spi' | 'i2c' | 'parallel-rgb';
export type TouchType = 'none' | 'resistive' | 'capacitive-fts' | 'capacitive-ipt';
export type DisplayMounting = 'gpio-mate' | 'shield' | 'standalone' | 'corner-screws';

export type DisplayFraming =
  | 'top-window'
  | 'recessed-bezel'
  | 'flush-glass'
  | 'hood-shade'
  | 'tilted'
  | 'removable-cap'
  | 'bracket-only';

export interface DisplayBezel {
  top: Mm;
  right: Mm;
  bottom: Mm;
  left: Mm;
}

export interface DisplayActiveArea {
  x: Mm;
  y: Mm;
  offsetX: Mm;
  offsetY: Mm;
}

export interface DisplayProfile {
  id: string;
  name: string;
  manufacturer: string;
  pcb: { size: { x: Mm; y: Mm; z: Mm } };
  activeArea: DisplayActiveArea;
  bezel: DisplayBezel;
  /** PCB bottom -> top of glass + touch (mm). Drives stacked Z. */
  overallHeight: Mm;
  mounting: DisplayMounting;
  mountingHoles: MountingHole[];
  interface: DisplayInterface;
  touch: TouchType;
  components: BoardComponent[];
  /** Empty array = generic / universally compatible. */
  compatibleBoards: string[];
  source?: string;
  builtin: boolean;
}

export interface DisplayPlacement {
  id: string;
  displayId: string;
  framing: DisplayFraming;
  /** Only used when framing='tilted'. */
  tiltAngle?: number;
  /** Only used when framing='hood-shade'. */
  hoodHeight?: Mm;
  /** Only used when framing='recessed-bezel'. */
  bezelInset?: Mm;
  /** XY offset relative to the host board's PCB origin. Default centered. */
  offset: { x: Mm; y: Mm };
  /** How the host board is supported when display PCB is larger. */
  hostSupport: 'gpio-only' | 'case-rim-bracket' | 'under-board-posts' | 'full-cradle';
  enabled: boolean;
}
