import { useMemo } from 'react';
import * as THREE from 'three';
import { useProjectStore } from '@/store/projectStore';
import { decodeAssetMesh } from '@/engine/import/assetImporter';

export function ExternalAssetMeshes() {
  const assets = useProjectStore((s) => s.project.externalAssets);
  return (
    <group>
      {assets
        .filter((a) => a.visibility === 'reference')
        .map((a) => (
          <ReferenceAssetMesh key={a.id} assetId={a.id} />
        ))}
    </group>
  );
}

function ReferenceAssetMesh({ assetId }: { assetId: string }) {
  const asset = useProjectStore((s) => s.project.externalAssets.find((a) => a.id === assetId));
  const geom = useMemo(() => {
    if (!asset) return null;
    try {
      const parsed = decodeAssetMesh(asset);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(parsed.positions, 3));
      g.setIndex(new THREE.BufferAttribute(parsed.indices, 1));
      g.computeVertexNormals();
      return g;
    } catch {
      return null;
    }
  }, [asset]);
  if (!asset || !geom) return null;
  return (
    <mesh
      geometry={geom}
      position={asset.transform.position}
      rotation={asset.transform.rotation.map((d) => (d * Math.PI) / 180) as [number, number, number]}
      scale={asset.transform.scale}
      name={`asset-${assetId}`}
      userData={{ assetId }}
    >
      <meshStandardMaterial color="#d0a060" transparent opacity={0.6} metalness={0.05} roughness={0.85} />
    </mesh>
  );
}
