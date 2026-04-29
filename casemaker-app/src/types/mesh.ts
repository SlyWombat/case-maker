import type { Mm, BBox } from './units';

export interface MeshBuffer {
  positions: Float32Array;
  indices: Uint32Array;
}

export interface MeshStats {
  vertexCount: number;
  triangleCount: number;
  bbox: BBox;
  /** Issue #83 — number of disjoint solid components in this node. A clean
   *  shell or lid has exactly 1; >1 means at least one piece broke loose
   *  from its parent (a snap-fit lip not unioned with the wall, an
   *  orphaned cutout fragment, etc.) and will fall to the build plate
   *  in the slicer. Surfaced as a warning, not a hard error — the user
   *  can still export and clean up in their slicer. */
  componentCount?: number;
}

export interface MeshNode {
  id: string;
  buffer: MeshBuffer;
  stats: MeshStats;
}

export interface BuildResult {
  generation: number;
  nodes: MeshNode[];
  combinedStats: MeshStats;
  durationMs: Mm;
}
