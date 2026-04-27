import type { BoardProfile, CaseParameters, PortPlacement } from '@/types';
import { type BuildOp } from './buildPlan';
import { buildAxisAlignedCutout } from './roundCutout';

const OVERSHOOT = 1;

export function buildPortCutoutOp(
  port: PortPlacement,
  board: BoardProfile,
  params: CaseParameters,
): BuildOp | null {
  if (!port.enabled) return null;
  if (port.facing === '+z') return null;

  const m = port.cutoutMargin;
  const { wallThickness: wall, internalClearance: cl, floorThickness: floor } = params;
  const pcb = board.pcb.size;

  let xMin = port.position.x - m;
  let xMax = port.position.x + port.size.x + m;
  let yMin = port.position.y - m;
  let yMax = port.position.y + port.size.y + m;
  const zMin = port.position.z - m;
  const zMax = port.position.z + port.size.z + m;

  switch (port.facing) {
    case '-x':
      xMin = -(wall + cl) - OVERSHOOT;
      break;
    case '+x':
      xMax = pcb.x + cl + wall + OVERSHOOT;
      break;
    case '-y':
      yMin = -(wall + cl) - OVERSHOOT;
      break;
    case '+y':
      yMax = pcb.y + cl + wall + OVERSHOOT;
      break;
  }

  const sizeX = xMax - xMin;
  const sizeY = yMax - yMin;
  const sizeZ = zMax - zMin;
  if (sizeX <= 0 || sizeY <= 0 || sizeZ <= 0) return null;

  const wx = wall + cl + xMin;
  const wy = wall + cl + yMin;
  const wz = floor + zMin;

  return buildAxisAlignedCutout(
    port.facing,
    wx,
    wy,
    wz,
    sizeX,
    sizeY,
    sizeZ,
    port.cutoutShape ?? 'rect',
  );
}

export function buildPortCutoutsForProject(
  ports: PortPlacement[],
  board: BoardProfile,
  params: CaseParameters,
): BuildOp[] {
  const out: BuildOp[] = [];
  for (const p of ports) {
    const op = buildPortCutoutOp(p, board, params);
    if (op) out.push(op);
  }
  return out;
}
