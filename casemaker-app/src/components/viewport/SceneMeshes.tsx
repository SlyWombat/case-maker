import { useMemo } from 'react';
import * as THREE from 'three';
import { useJobStore } from '@/store/jobStore';
import { useViewportStore } from '@/store/viewportStore';
import { bufferToGeometry } from '@/engine/scene/meshFromBuffer';
import { ExternalAssetMeshes } from './ExternalAssetMeshes';
import { PortMarkers } from './PortMarkers';
import { BoardPlaceholderMesh } from './BoardPlaceholderMesh';
import { HatPlaceholderMeshes } from './HatPlaceholderMeshes';

interface NodeMeshProps {
  id: string;
  color: string;
  opacity?: number;
}

function NodeMesh({ id, color, opacity = 1 }: NodeMeshProps) {
  const node = useJobStore((s) => s.nodes.get(id));
  const geometry = useMemo<THREE.BufferGeometry | null>(
    () => (node ? bufferToGeometry(node.buffer) : null),
    [node],
  );
  if (!geometry) return null;
  return (
    <mesh geometry={geometry} name={id} userData={{ id }}>
      <meshStandardMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        metalness={0.1}
        roughness={0.7}
      />
    </mesh>
  );
}

/**
 * Issue #91 — exploded-lift formula. Targets a 2 mm gap between the deepest
 * lid-attached protrusion (snap arm tip, lid post tip, etc.) and the
 * shell's top surface. Reads bboxes from the worker output, so the gap is
 * always large enough for the actual geometry. Fallback to 8 mm when stats
 * aren't available yet (first frame, before the worker reports).
 */
function useExplodedLift(): number {
  const shell = useJobStore((s) => s.nodes.get('shell'));
  const lid = useJobStore((s) => s.nodes.get('lid'));
  if (!shell || !lid) return 8;
  const shellTopZ = shell.stats.bbox.max[2];
  const lidBottomZ = lid.stats.bbox.min[2];
  // Required lift to put lidBottomZ + lift >= shellTopZ + 2.
  return Math.max(shellTopZ + 2 - lidBottomZ, 6);
}

export function SceneMeshes() {
  const viewMode = useViewportStore((s) => s.viewMode);
  const explodedLift = useExplodedLift();
  // Issue #91 — view-mode dispatch:
  //   complete  : lid at assembled Z (no lift)
  //   exploded  : dynamic lift to clear deepest lid feature
  //   base-only : lid hidden
  //   lid-only  : shell hidden, lid at assembled Z
  const showShell = viewMode !== 'lid-only';
  const showLidMesh = viewMode !== 'base-only';
  const lift = viewMode === 'exploded' ? explodedLift : 0;
  return (
    <group>
      {showShell && <NodeMesh id="shell" color="#88a4cc" opacity={0.55} />}
      {showLidMesh && (
        <group position={[0, 0, lift]}>
          <NodeMesh id="lid" color="#a8b8d0" opacity={0.6} />
        </group>
      )}
      {showShell && <BoardPlaceholderMesh />}
      {showShell && <HatPlaceholderMeshes />}
      <ExternalAssetMeshes />
      <PortMarkers />
    </group>
  );
}
