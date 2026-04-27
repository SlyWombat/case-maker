import type { StlMeshInput } from './stlBinary';

export function buildAsciiStl(meshes: StlMeshInput[], solidName = 'casemaker'): string {
  const out: string[] = [];
  out.push(`solid ${solidName}`);
  for (const m of meshes) {
    const triCount = m.indices.length / 3;
    for (let t = 0; t < triCount; t++) {
      const i0 = m.indices[t * 3]!;
      const i1 = m.indices[t * 3 + 1]!;
      const i2 = m.indices[t * 3 + 2]!;
      const x0 = m.positions[i0 * 3]!;
      const y0 = m.positions[i0 * 3 + 1]!;
      const z0 = m.positions[i0 * 3 + 2]!;
      const x1 = m.positions[i1 * 3]!;
      const y1 = m.positions[i1 * 3 + 1]!;
      const z1 = m.positions[i1 * 3 + 2]!;
      const x2 = m.positions[i2 * 3]!;
      const y2 = m.positions[i2 * 3 + 1]!;
      const z2 = m.positions[i2 * 3 + 2]!;
      const ux = x1 - x0,
        uy = y1 - y0,
        uz = z1 - z0;
      const vx = x2 - x0,
        vy = y2 - y0,
        vz = z2 - z0;
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz);
      if (len > 0) {
        nx /= len;
        ny /= len;
        nz /= len;
      }
      out.push(`  facet normal ${fmt(nx)} ${fmt(ny)} ${fmt(nz)}`);
      out.push('    outer loop');
      out.push(`      vertex ${fmt(x0)} ${fmt(y0)} ${fmt(z0)}`);
      out.push(`      vertex ${fmt(x1)} ${fmt(y1)} ${fmt(z1)}`);
      out.push(`      vertex ${fmt(x2)} ${fmt(y2)} ${fmt(z2)}`);
      out.push('    endloop');
      out.push('  endfacet');
    }
  }
  out.push(`endsolid ${solidName}`);
  out.push('');
  return out.join('\n');
}

function fmt(v: number): string {
  return Number.isFinite(v) ? v.toFixed(6) : '0.000000';
}
