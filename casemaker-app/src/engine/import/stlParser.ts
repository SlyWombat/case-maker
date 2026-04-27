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
  // Heuristic: ASCII STL starts with "solid"; binary often does too in the header but we
  // verify by checking the declared triangle count matches the byte length.
  const dv = new DataView(buf);
  const triCount = dv.getUint32(80, true);
  return buf.byteLength >= 84 + triCount * 50;
}
