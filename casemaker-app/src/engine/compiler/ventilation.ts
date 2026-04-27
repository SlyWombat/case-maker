import type { CaseParameters, BoardProfile } from '@/types';
import { cube, translate, type BuildOp } from './buildPlan';
import { computeShellDims } from './caseShell';

const SLOT_WIDTH = 3;
const SLOT_GAP = 3;
const SLOT_INSET_FROM_EDGE = 6;

export function buildVentilationCutouts(
  board: BoardProfile,
  params: CaseParameters,
): BuildOp[] {
  if (!params.ventilation.enabled) return [];
  if (params.ventilation.pattern !== 'slots') return [];

  const dims = computeShellDims(board, params);
  const { wallThickness: wall, floorThickness: floor } = params;
  const coverage = Math.max(0, Math.min(1, params.ventilation.coverage));
  if (coverage <= 0) return [];

  // Cut vertical slots through the +y wall (back). Slot length covers most of cavity height.
  const slotHeight = (dims.cavityZ - 4) * coverage;
  if (slotHeight <= 1) return [];
  const slotZ = floor + 2;
  const usableX = dims.outerX - 2 * SLOT_INSET_FROM_EDGE;
  const stride = SLOT_WIDTH + SLOT_GAP;
  const slotCount = Math.max(1, Math.floor(usableX / stride));
  const totalUsed = slotCount * stride - SLOT_GAP;
  const startX = (dims.outerX - totalUsed) / 2;

  const ops: BuildOp[] = [];
  for (let i = 0; i < slotCount; i++) {
    const xPos = startX + i * stride;
    ops.push(
      translate(
        [xPos, dims.outerY - wall - 1, slotZ],
        cube([SLOT_WIDTH, wall + 2, slotHeight], false),
      ),
    );
  }
  return ops;
}
