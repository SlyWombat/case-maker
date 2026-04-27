import type { Facing, PortPlacement, BoardProfile } from '@/types';

export interface AxisLock {
  lockX: boolean;
  lockY: boolean;
  lockZ: boolean;
}

/**
 * For a given port facing, return which world-axis dragging is disallowed on.
 * A '-y' port pierces the -y wall; X (along the wall) and Z (height) are free
 * to drag, but Y is locked (the cutout must stay attached to that wall).
 * '+z' (top-facing) ports lock Z and let X/Y drag freely.
 */
export function axisLockForFacing(facing: Facing | undefined): AxisLock {
  switch (facing) {
    case '+x':
    case '-x':
      return { lockX: true, lockY: false, lockZ: false };
    case '+y':
    case '-y':
      return { lockX: false, lockY: true, lockZ: false };
    case '+z':
      return { lockX: false, lockY: false, lockZ: true };
    default:
      return { lockX: false, lockY: false, lockZ: false };
  }
}

export function snapToGrid(value: number, grid: number): number {
  if (grid <= 0) return value;
  return Math.round(value / grid) * grid;
}

export interface PortBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export function portBounds(board: BoardProfile, port: PortPlacement): PortBounds {
  const margin = 0.5;
  return {
    minX: -margin,
    maxX: board.pcb.size.x - port.size.x + margin,
    minY: -margin,
    maxY: board.pcb.size.y - port.size.y + margin,
    minZ: 0,
    maxZ: 30,
  };
}

export function clampPortPosition(
  raw: { x: number; y: number; z: number },
  bounds: PortBounds,
): { x: number; y: number; z: number } {
  return {
    x: Math.min(Math.max(raw.x, bounds.minX), bounds.maxX),
    y: Math.min(Math.max(raw.y, bounds.minY), bounds.maxY),
    z: Math.min(Math.max(raw.z, bounds.minZ), bounds.maxZ),
  };
}

export interface NudgeKeys {
  ArrowLeft: [number, number, number];
  ArrowRight: [number, number, number];
  ArrowUp: [number, number, number];
  ArrowDown: [number, number, number];
}

/**
 * Map arrow keys to world-axis nudge vectors per facing. Arrow keys nudge
 * along the two axes perpendicular to the facing direction so the port
 * stays on its wall.
 */
export function nudgeVectorsForFacing(facing: Facing | undefined): NudgeKeys {
  switch (facing) {
    case '+x':
    case '-x':
      // Wall is on -x/+x face; left/right nudges Y, up/down nudges Z.
      return {
        ArrowLeft: [0, -1, 0],
        ArrowRight: [0, 1, 0],
        ArrowUp: [0, 0, 1],
        ArrowDown: [0, 0, -1],
      };
    case '+y':
    case '-y':
      // Wall is on -y/+y face; left/right nudges X, up/down nudges Z.
      return {
        ArrowLeft: [-1, 0, 0],
        ArrowRight: [1, 0, 0],
        ArrowUp: [0, 0, 1],
        ArrowDown: [0, 0, -1],
      };
    case '+z':
      // Top face; left/right nudges X, up/down nudges Y.
      return {
        ArrowLeft: [-1, 0, 0],
        ArrowRight: [1, 0, 0],
        ArrowUp: [0, 1, 0],
        ArrowDown: [0, -1, 0],
      };
    default:
      return {
        ArrowLeft: [-1, 0, 0],
        ArrowRight: [1, 0, 0],
        ArrowUp: [0, 1, 0],
        ArrowDown: [0, -1, 0],
      };
  }
}

export function defaultGridStep(): number {
  return 0.5;
}
