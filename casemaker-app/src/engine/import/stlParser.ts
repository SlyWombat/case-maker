export interface ParsedMesh {
  positions: Float32Array;
  indices: Uint32Array;
  triangleCount: number;
  bbox: { min: [number, number, number]; max: [number, number, number] };
}

export function parseBinaryStl(buf: ArrayBuffer): ParsedMesh {
  const dv = new DataView(buf);
  if (buf.byteLength < 84) throw new Error('STL: file too small to contain a header');
  const triCount = dv.getUint32(80, true);
  const expected = 84 + triCount * 50;
  if (buf.byteLength < expected) {
    throw new Error(
      `STL: declared ${triCount} triangles but file size ${buf.byteLength} is shorter than required ${expected}`,
    );
  }
  const positions = new Float32Array(triCount * 9);
  const indices = new Uint32Array(triCount * 3);
  let off = 84;
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  for (let t = 0; t < triCount; t++) {
    off += 12;
    for (let v = 0; v < 3; v++) {
      const x = dv.getFloat32(off, true);
      const y = dv.getFloat32(off + 4, true);
      const z = dv.getFloat32(off + 8, true);
      positions[t * 9 + v * 3] = x;
      positions[t * 9 + v * 3 + 1] = y;
      positions[t * 9 + v * 3 + 2] = z;
      indices[t * 3 + v] = t * 3 + v;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
      off += 12;
    }
    off += 2;
  }
  return {
    positions,
    indices,
    triangleCount: triCount,
    bbox: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] },
  };
}

export function looksLikeBinaryStl(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 84) return false;
  const dv = new DataView(buf);
  const triCount = dv.getUint32(80, true);
  return buf.byteLength === 84 + triCount * 50;
}

export function looksLikeAsciiStl(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 6) return false;
  const head = new Uint8Array(buf, 0, Math.min(80, buf.byteLength));
  const text = new TextDecoder('utf-8', { fatal: false }).decode(head).trimStart().toLowerCase();
  return text.startsWith('solid') && !looksLikeBinaryStl(buf);
}

const VERTEX_RE = /vertex\s+(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

export function parseAsciiStl(text: string): ParsedMesh {
  const flat: number[] = [];
  let m: RegExpExecArray | null;
  VERTEX_RE.lastIndex = 0;
  while ((m = VERTEX_RE.exec(text)) !== null) {
    flat.push(parseFloat(m[1]!), parseFloat(m[2]!), parseFloat(m[3]!));
  }
  if (flat.length === 0 || flat.length % 9 !== 0) {
    throw new Error(`ASCII STL: parsed ${flat.length / 3} vertices, not a multiple of 3`);
  }
  const triCount = flat.length / 9;
  const positions = new Float32Array(flat);
  const indices = new Uint32Array(triCount * 3);
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  for (let i = 0; i < triCount * 3; i++) indices[i] = i;
  for (let i = 0; i < triCount * 3; i++) {
    const x = positions[i * 3]!;
    const y = positions[i * 3 + 1]!;
    const z = positions[i * 3 + 2]!;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  return {
    positions,
    indices,
    triangleCount: triCount,
    bbox: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] },
  };
}

export function parseStl(buf: ArrayBuffer): ParsedMesh {
  if (looksLikeBinaryStl(buf)) return parseBinaryStl(buf);
  if (looksLikeAsciiStl(buf)) {
    const text = new TextDecoder('utf-8').decode(buf);
    return parseAsciiStl(text);
  }
  throw new Error('STL: not recognized as binary or ASCII');
}
