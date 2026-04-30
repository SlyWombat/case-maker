import { useMemo } from 'react';
import * as THREE from 'three';
import { useProjectStore } from '@/store/projectStore';
import { useViewportStore } from '@/store/viewportStore';
import { buildHatPlaceholderGroup } from '@/engine/scene/boardPlaceholder';
import { computeHatBaseZ } from '@/engine/compiler/hats';
import { getBuiltinHat } from '@/library/hats';
import type { HatProfile } from '@/types';

/**
 * Issue #83 — render a placeholder mesh for each enabled HAT placement so
 * users can see the stack and click-select an individual HAT for nudging.
 * Each HAT is its own clickable Three group; selection writes
 * `{ kind: 'hat', hatPlacementId }` to the viewport store.
 *
 * The Z position comes from the same `computeHatBaseZ` the compiler uses
 * for cutouts (returns the world-frame Z of each HAT's PCB bottom),
 * guaranteeing the visual stack tracks the simulated stack.
 */
export function HatPlaceholderMeshes() {
  const board = useProjectStore((s) => s.project.board);
  const params = useProjectStore((s) => s.project.case);
  const hats = useProjectStore((s) => s.project.hats);
  const customHats = useProjectStore((s) => s.project.customHats);
  const showBoard = useViewportStore((s) => s.showBoard);

  const items = useMemo(() => {
    if (!hats || hats.length === 0) return [];
    const resolveHat = (id: string): HatProfile | undefined =>
      (customHats ?? []).find((h) => h.id === id) ?? getBuiltinHat(id);
    const baseZ = computeHatBaseZ(board, params, hats, resolveHat);
    const wall = params.wallThickness;
    const cl = params.internalClearance;
    const out: { placementId: string; group: THREE.Group }[] = [];
    for (const placement of hats) {
      if (!placement.enabled) continue;
      const profile = resolveHat(placement.hatId);
      if (!profile) continue;
      const z0 = baseZ.get(placement.id);
      if (z0 === undefined) continue;
      const offX = placement.offsetOverride?.x ?? 0;
      const offY = placement.offsetOverride?.y ?? 0;
      // computeHatBaseZ returns the PCB-bottom Z. buildHatPlaceholderGroup
      // expects the lower-left corner; the cavity's XY origin is
      // (wall + cl), so anchor here.
      const group = buildHatPlaceholderGroup(profile, {
        origin: { x: wall + cl + offX, y: wall + cl + offY, z: z0 },
      });
      out.push({ placementId: placement.id, group });
    }
    return out;
  }, [
    board,
    params.wallThickness,
    params.internalClearance,
    params.floorThickness,
    hats,
    customHats,
  ]);

  if (!showBoard) return null;
  return (
    <group>
      {items.map(({ placementId, group }) => (
        <primitive
          key={placementId}
          object={group}
          onClick={(e: { stopPropagation: () => void }) => {
            const { activeTool, showBoard: showBoardNow, setSelection } =
              useViewportStore.getState();
            if (activeTool !== 'select' || !showBoardNow) return;
            e.stopPropagation();
            setSelection({ kind: 'hat', hatPlacementId: placementId });
          }}
        />
      ))}
    </group>
  );
}
