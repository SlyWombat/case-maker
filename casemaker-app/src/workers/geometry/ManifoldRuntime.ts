import ManifoldModule from 'manifold-3d';
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import type { BuildOp } from '@/engine/compiler/buildPlan';

type ManifoldClass = Awaited<ReturnType<typeof ManifoldModule>>['Manifold'];
type ManifoldInstance = InstanceType<ManifoldClass>;

let toplevelPromise: ReturnType<typeof ManifoldModule> | null = null;

async function getToplevel(): Promise<Awaited<ReturnType<typeof ManifoldModule>>> {
  if (!toplevelPromise) {
    toplevelPromise = ManifoldModule({ locateFile: () => wasmUrl as string });
  }
  const tl = await toplevelPromise;
  tl.setup();
  return tl;
}

export class CancelledError extends Error {
  constructor() {
    super('Geometry build cancelled');
    this.name = 'CancelledError';
  }
}

export type GenerationCheck = () => void;

async function executeOp(
  tl: Awaited<ReturnType<typeof ManifoldModule>>,
  op: BuildOp,
  check: GenerationCheck,
): Promise<ManifoldInstance> {
  check();
  const Manifold = tl.Manifold;
  switch (op.kind) {
    case 'cube':
      return Manifold.cube(op.size, op.center ?? false);
    case 'cylinder':
      return Manifold.cylinder(
        op.height,
        op.radiusLow,
        op.radiusHigh ?? op.radiusLow,
        op.segments ?? 0,
        op.center ?? false,
      );
    case 'mesh': {
      const dedup = deduplicateMesh(op.positions, op.indices);
      console.log('[worker] mesh op: dedup verts', dedup.positions.length / 3, 'tris', dedup.indices.length / 3);
      try {
        const meshObj = new tl.Mesh({
          numProp: 3,
          vertProperties: dedup.positions,
          triVerts: dedup.indices,
        });
        const m = new Manifold(meshObj);
        console.log('[worker] mesh op: built Manifold OK');
        return m;
      } catch (e) {
        console.error('[worker] mesh op failed:', e);
        throw e;
      }
    }
    case 'translate': {
      const child = await executeOp(tl, op.child, check);
      const result = child.translate(op.offset);
      child.delete();
      return result;
    }
    case 'rotate': {
      const child = await executeOp(tl, op.child, check);
      const result = child.rotate(op.degrees);
      child.delete();
      return result;
    }
    case 'scale': {
      const child = await executeOp(tl, op.child, check);
      const result = child.scale([op.factor, op.factor, op.factor]);
      child.delete();
      return result;
    }
    case 'union':
    case 'difference':
    case 'intersection': {
      const children: ManifoldInstance[] = [];
      for (const c of op.children) children.push(await executeOp(tl, c, check));
      check();
      let result: ManifoldInstance;
      if (op.kind === 'union') result = Manifold.union(children);
      else if (op.kind === 'difference') result = Manifold.difference(children);
      else result = Manifold.intersection(children);
      children.forEach((c) => c.delete());
      return result;
    }
  }
}

export interface NodeMeshOutput {
  positions: Float32Array;
  indices: Uint32Array;
  triangleCount: number;
  vertexCount: number;
  bbox: { min: [number, number, number]; max: [number, number, number] };
}

export async function buildOp(op: BuildOp, check: GenerationCheck): Promise<NodeMeshOutput> {
  const tl = await getToplevel();
  const m = await executeOp(tl, op, check);
  try {
    check();
    const mesh = m.getMesh();
    const positions = new Float32Array(mesh.vertProperties);
    const indices = new Uint32Array(mesh.triVerts);
    const numProp = mesh.numProp;
    const numVert = positions.length / numProp;
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity,
      maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;
    for (let i = 0; i < numVert; i++) {
      const x = positions[i * numProp]!;
      const y = positions[i * numProp + 1]!;
      const z = positions[i * numProp + 2]!;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }
    return {
      positions: numProp === 3 ? positions : flattenPositions(positions, numProp, numVert),
      indices,
      triangleCount: indices.length / 3,
      vertexCount: numVert,
      bbox: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] },
    };
  } finally {
    m.delete();
  }
}

function flattenPositions(src: Float32Array, numProp: number, numVert: number): Float32Array {
  const out = new Float32Array(numVert * 3);
  for (let i = 0; i < numVert; i++) {
    out[i * 3] = src[i * numProp]!;
    out[i * 3 + 1] = src[i * numProp + 1]!;
    out[i * 3 + 2] = src[i * numProp + 2]!;
  }
  return out;
}

const DEDUP_PRECISION = 1e5;

function deduplicateMesh(
  positions: Float32Array,
  indices: Uint32Array,
): { positions: Float32Array; indices: Uint32Array } {
  const map = new Map<string, number>();
  const newPos: number[] = [];
  const newIdx = new Uint32Array(indices.length);
  for (let i = 0; i < indices.length; i++) {
    const v = indices[i]!;
    const x = Math.round(positions[v * 3]! * DEDUP_PRECISION) / DEDUP_PRECISION;
    const y = Math.round(positions[v * 3 + 1]! * DEDUP_PRECISION) / DEDUP_PRECISION;
    const z = Math.round(positions[v * 3 + 2]! * DEDUP_PRECISION) / DEDUP_PRECISION;
    const key = `${x},${y},${z}`;
    let id = map.get(key);
    if (id === undefined) {
      id = newPos.length / 3;
      newPos.push(x, y, z);
      map.set(key, id);
    }
    newIdx[i] = id;
  }
  return { positions: new Float32Array(newPos), indices: newIdx };
}
