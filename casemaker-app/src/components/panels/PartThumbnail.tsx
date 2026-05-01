import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useJobStore } from '@/store/jobStore';

interface PartThumbnailProps {
  partId: string;
  size: number;
  /** Tint for the rendered material (rigid vs flex parts). */
  color?: string;
}

/** Renders a small isometric preview of a top-level BuildPlan node into an
 *  offscreen Three.js canvas, then displays the resulting PNG. Re-renders
 *  whenever the underlying mesh buffer changes (the engine swaps it on
 *  every recompile) so the thumbnail tracks live geometry edits. */
export function PartThumbnail({ partId, size, color = '#9ca3af' }: PartThumbnailProps) {
  const node = useJobStore((s) => s.nodes.get(partId));
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!node) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    let renderer: THREE.WebGLRenderer | null = null;
    let geo: THREE.BufferGeometry | null = null;
    let mat: THREE.MeshStandardMaterial | null = null;
    try {
      geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(node.buffer.positions, 3));
      geo.setIndex(new THREE.BufferAttribute(node.buffer.indices, 1));
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      const sphere = geo.boundingSphere;
      if (!sphere || sphere.radius === 0) return;
      const canvas = document.createElement('canvas');
      // Render at 2× for retina-sharp downscale.
      canvas.width = size * 2;
      canvas.height = size * 2;
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setClearColor(0x000000, 0);
      renderer.setSize(size * 2, size * 2, false);
      const scene = new THREE.Scene();
      mat = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05 });
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
      scene.add(new THREE.AmbientLight(0xffffff, 0.45));
      const key = new THREE.DirectionalLight(0xffffff, 0.85);
      key.position.set(3, -2, 4);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xffffff, 0.25);
      fill.position.set(-2, 3, -1);
      scene.add(fill);
      // Camera framed isometric-ish so the part reads as 3D. Z is up in
      // the project's world coords; pull the camera back along (1,-1,0.6)
      // and aim at the part's bounding sphere center.
      const fov = 28;
      const dist = sphere.radius / Math.sin((fov / 2) * Math.PI / 180) * 1.25;
      const camera = new THREE.PerspectiveCamera(fov, 1, Math.max(0.1, sphere.radius * 0.05), sphere.radius * 20);
      const dir = new THREE.Vector3(1, -1, 0.6).normalize();
      camera.position.copy(sphere.center).addScaledVector(dir, dist);
      camera.up.set(0, 0, 1);
      camera.lookAt(sphere.center);
      renderer.render(scene, camera);
      if (cancelled) return;
      setSrc(canvas.toDataURL('image/png'));
    } catch {
      // WebGL not available or render failed — leave src null and the
      // placeholder square shows.
      setSrc(null);
    }
    return () => {
      cancelled = true;
      if (renderer) renderer.dispose();
      if (geo) geo.dispose();
      if (mat) mat.dispose();
    };
  }, [node, partId, size, color]);

  const placeholderStyle: React.CSSProperties = {
    width: size,
    height: size,
    background: '#1f2530',
    border: '1px solid #2a2f36',
    borderRadius: 3,
    display: 'inline-block',
  };
  if (!src) return <div aria-hidden style={placeholderStyle} />;
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      style={{ display: 'block', borderRadius: 3, border: '1px solid #2a2f36' }}
    />
  );
}
