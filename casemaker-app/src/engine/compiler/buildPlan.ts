import type { Vec3 } from '@/types';

export type BuildOp =
  | { kind: 'cube'; size: Vec3; center?: boolean }
  | {
      kind: 'cylinder';
      height: number;
      radiusLow: number;
      radiusHigh?: number;
      segments?: number;
      center?: boolean;
    }
  | { kind: 'translate'; offset: Vec3; child: BuildOp }
  | { kind: 'rotate'; degrees: Vec3; child: BuildOp }
  | { kind: 'scale'; factor: number; child: BuildOp }
  | { kind: 'mesh'; positions: Float32Array; indices: Uint32Array }
  | { kind: 'union'; children: BuildOp[] }
  | { kind: 'difference'; children: BuildOp[] }
  | { kind: 'intersection'; children: BuildOp[] };

export interface BuildNode {
  id: string;
  op: BuildOp;
}

export interface BuildPlan {
  nodes: BuildNode[];
}

export function cube(size: Vec3, center = false): BuildOp {
  return { kind: 'cube', size, center };
}

export function cylinder(
  height: number,
  radius: number,
  segments = 48,
  center = false,
): BuildOp {
  return { kind: 'cylinder', height, radiusLow: radius, segments, center };
}

export function translate(offset: Vec3, child: BuildOp): BuildOp {
  return { kind: 'translate', offset, child };
}

export function rotate(degrees: Vec3, child: BuildOp): BuildOp {
  return { kind: 'rotate', degrees, child };
}

export function scale(factor: number, child: BuildOp): BuildOp {
  return { kind: 'scale', factor, child };
}

export function mesh(positions: Float32Array, indices: Uint32Array): BuildOp {
  return { kind: 'mesh', positions, indices };
}

export function difference(children: BuildOp[]): BuildOp {
  return { kind: 'difference', children };
}

export function union(children: BuildOp[]): BuildOp {
  return { kind: 'union', children };
}

export function collectMeshTransferables(op: BuildOp): ArrayBuffer[] {
  const out: ArrayBuffer[] = [];
  walk(op);
  return out;
  function walk(o: BuildOp): void {
    switch (o.kind) {
      case 'mesh':
        out.push(o.positions.buffer as ArrayBuffer, o.indices.buffer as ArrayBuffer);
        return;
      case 'translate':
      case 'rotate':
      case 'scale':
        walk(o.child);
        return;
      case 'union':
      case 'difference':
      case 'intersection':
        for (const c of o.children) walk(c);
        return;
      default:
        return;
    }
  }
}
