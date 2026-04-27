import type { Mm } from './units';

export type AntennaType = 'internal' | 'rpi-external' | 'external-mount';
export type AntennaFacing = '+x' | '-x' | '+y' | '-y';

export const ANTENNA_SPECS: Record<
  AntennaType,
  { holeDiameter: Mm; counterboreDiameter: Mm; counterboreDepth?: Mm }
> = {
  internal: { holeDiameter: 0, counterboreDiameter: 0 },
  'rpi-external': { holeDiameter: 9.0, counterboreDiameter: 12.0 },
  'external-mount': { holeDiameter: 6.4, counterboreDiameter: 9.0 },
};

export interface AntennaPlacement {
  id: string;
  type: AntennaType;
  enabled: boolean;
  facing?: AntennaFacing;
  uOffset?: Mm;
}
