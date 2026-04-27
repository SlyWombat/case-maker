import type { Mm, Deg } from './units';
import type { BoardProfile } from './board';
import type { CaseParameters } from './case';
import type { PortPlacement } from './port';
import type { HatProfile, HatPlacement } from './hat';
import type { MountingFeature } from './mounting';
import type { DisplayProfile, DisplayPlacement } from './display';

export interface ExternalAsset {
  id: string;
  name: string;
  format: 'stl' | '3mf';
  data: string;
  transform: {
    position: [Mm, Mm, Mm];
    rotation: [Deg, Deg, Deg];
    scale: number;
  };
  visibility: 'reference' | 'subtract' | 'union';
}

export type ProjectSchemaVersion = 1 | 2 | 3;

export interface Project {
  schemaVersion: ProjectSchemaVersion;
  id: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  board: BoardProfile;
  case: CaseParameters;
  ports: PortPlacement[];
  externalAssets: ExternalAsset[];
  /** Stacked HATs / shields (Phase 8a, schemaVersion 2+). v1 projects default to []. */
  hats: HatPlacement[];
  /** User-defined HAT profiles (schemaVersion 2+). v1 projects default to []. */
  customHats: HatProfile[];
  /** External mounting features (schemaVersion 3+). v1/v2 projects default to []. */
  mountingFeatures: MountingFeature[];
  /** At most one display placement (Phase 9a, schemaVersion 3+). */
  display: DisplayPlacement | null;
  /** User-defined display profiles. */
  customDisplays: DisplayProfile[];
}
