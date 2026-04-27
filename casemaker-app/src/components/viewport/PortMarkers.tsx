import { useMemo, useCallback } from 'react';
import { PivotControls } from '@react-three/drei';
import * as THREE from 'three';
import { useProjectStore } from '@/store/projectStore';
import { useViewportStore } from '@/store/viewportStore';
import type { PortPlacement } from '@/types';

interface MarkerInfo {
  port: PortPlacement;
  worldX: number;
  worldY: number;
  worldZ: number;
}

export function PortMarkers() {
  const ports = useProjectStore((s) => s.project.ports);
  const caseParams = useProjectStore((s) => s.project.case);
  const selectedId = useViewportStore((s) => s.selectedPortId);
  const select = useViewportStore((s) => s.selectPort);
  const patchPort = useProjectStore((s) => s.patchPort);

  const markers = useMemo<MarkerInfo[]>(() => {
    const { wallThickness: wall, internalClearance: cl, floorThickness: floor } = caseParams;
    return ports.map((p) => ({
      port: p,
      worldX: wall + cl + p.position.x + p.size.x / 2,
      worldY: wall + cl + p.position.y + p.size.y / 2,
      worldZ: floor + p.position.z + p.size.z / 2,
    }));
  }, [ports, caseParams]);

  const onDrag = useCallback(
    (id: string, m: THREE.Matrix4, port: PortPlacement, baseX: number, baseY: number, baseZ: number) => {
      const t = new THREE.Vector3();
      t.setFromMatrixPosition(m);
      const dx = t.x;
      const dy = t.y;
      const dz = t.z;
      patchPort(id, {
        position: {
          x: port.position.x + dx - (baseX - (caseParams.wallThickness + caseParams.internalClearance) - port.size.x / 2),
          y: port.position.y + dy - (baseY - (caseParams.wallThickness + caseParams.internalClearance) - port.size.y / 2),
          z: port.position.z + dz - (baseZ - caseParams.floorThickness - port.size.z / 2),
        },
      });
    },
    [patchPort, caseParams],
  );

  return (
    <group>
      {markers.map((m) => {
        const isSelected = m.port.id === selectedId;
        return (
          <group key={m.port.id} position={[m.worldX, m.worldY, m.worldZ]}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                select(m.port.id);
              }}
              userData={{ portId: m.port.id }}
              name={`port-marker-${m.port.id}`}
            >
              <sphereGeometry args={[1.2, 12, 12]} />
              <meshStandardMaterial
                color={isSelected ? '#ffd267' : m.port.enabled ? '#67c0ff' : '#666'}
                emissive={isSelected ? '#aa6600' : '#000'}
                emissiveIntensity={isSelected ? 0.6 : 0}
              />
            </mesh>
            {isSelected && (
              <PivotControls
                anchor={[0, 0, 0]}
                depthTest={false}
                lineWidth={2}
                scale={20}
                fixed
                disableRotations
                onDrag={(m4) =>
                  onDrag(
                    selectedId!,
                    m4,
                    m.port,
                    markers.find((x) => x.port.id === selectedId)?.worldX ?? m.worldX,
                    markers.find((x) => x.port.id === selectedId)?.worldY ?? m.worldY,
                    markers.find((x) => x.port.id === selectedId)?.worldZ ?? m.worldZ,
                  )
                }
              />
            )}
          </group>
        );
      })}
    </group>
  );
}

