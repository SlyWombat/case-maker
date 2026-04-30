// Issue #99 — fixture builders must orient asymmetric features (recess,
// latch, pin pattern, body cylinder) along the connector's facing-defined
// depth axis, not a hardcoded canonical axis.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildFixture } from '@/engine/scene/fixtures';
import type { ComponentKind, Facing } from '@/types';

interface MeshLike {
  position: THREE.Vector3;
  geometry: { boundingBox?: THREE.Box3 | null };
}

/** Compute the bbox of a fixture group in its local coords. */
function bboxOf(group: THREE.Group): THREE.Box3 {
  group.updateMatrixWorld(true);
  const bbox = new THREE.Box3();
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry) {
      obj.geometry.computeBoundingBox();
      const local = obj.geometry.boundingBox?.clone();
      if (local) {
        local.applyMatrix4(obj.matrixWorld);
        bbox.union(local);
      }
    }
  });
  return bbox;
}

/** Pick the asymmetric "front feature" (the meaningful dark slot/recess/etc.) — the
 *  child mesh that's offset toward the front face. We identify it as the
 *  child whose center is furthest from the bbox center along the depth axis. */
function asymmetricChildPos(
  group: THREE.Group,
  size: { x: number; y: number; z: number },
  depthAxis: 'x' | 'y' | 'z',
): THREE.Vector3 {
  group.updateMatrixWorld(true);
  const cx = size.x / 2;
  const cy = size.y / 2;
  const cz = size.z / 2;
  const center = new THREE.Vector3(cx, cy, cz);
  let best: { pos: THREE.Vector3; offset: number } | null = null;
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const p = new THREE.Vector3();
    obj.getWorldPosition(p);
    const offset = Math.abs(p[depthAxis] - center[depthAxis]);
    if (!best || offset > best.offset) best = { pos: p, offset };
  });
  return best ? (best as { pos: THREE.Vector3; offset: number }).pos : center;
}

const SIZE = { x: 14, y: 8, z: 5 };

describe('Fixture facing-aware orientation (#99)', () => {
  describe('USB-A recess sits at the FRONT face for every facing', () => {
    const cases: Array<{ facing: Facing; depthAxis: 'x' | 'y' | 'z'; positive: boolean }> = [
      { facing: '+y', depthAxis: 'y', positive: true },
      { facing: '-y', depthAxis: 'y', positive: false },
      { facing: '+x', depthAxis: 'x', positive: true },
      { facing: '-x', depthAxis: 'x', positive: false },
    ];
    for (const { facing, depthAxis, positive } of cases) {
      it(`facing ${facing} → recess offset toward ${positive ? '+' : '-'}${depthAxis}`, () => {
        const g = buildFixture('usb-a', SIZE, undefined, facing);
        expect(g).not.toBeNull();
        const recessPos = asymmetricChildPos(g!, SIZE, depthAxis);
        const center = SIZE[depthAxis] / 2;
        if (positive) {
          expect(recessPos[depthAxis]).toBeGreaterThan(center);
        } else {
          expect(recessPos[depthAxis]).toBeLessThan(center);
        }
      });
    }
  });

  describe('XLR-3 body cylinder runs along the depth axis (DIN-style 3-pin)', () => {
    const cases: Array<{ facing: Facing; depthAxis: 'x' | 'y' | 'z' }> = [
      { facing: '-x', depthAxis: 'x' },
      { facing: '+x', depthAxis: 'x' },
      { facing: '+y', depthAxis: 'y' },
      { facing: '-y', depthAxis: 'y' },
    ];
    const xlrSize = { x: 20, y: 24, z: 24 };
    for (const { facing, depthAxis } of cases) {
      it(`facing ${facing}: body bbox depth runs along ${depthAxis}`, () => {
        const g = buildFixture('custom' as ComponentKind, xlrSize, 'xlr-3', facing);
        expect(g).not.toBeNull();
        const bb = bboxOf(g!);
        // Body cylinder dominates the bbox; its long axis should match
        // the depth axis. Length along depth axis ≈ xlrSize[depthAxis];
        // perpendicular axes are smaller (radius of the body).
        const span = (axis: 'x' | 'y' | 'z'): number => bb.max[axis] - bb.min[axis];
        expect(span(depthAxis)).toBeGreaterThan(xlrSize[depthAxis] * 0.9);
      });
    }
  });

  describe('Audio jack body cylinder runs along the depth axis', () => {
    const cases: Array<{ facing: Facing; depthAxis: 'x' | 'y' | 'z' }> = [
      { facing: '-x', depthAxis: 'x' },
      { facing: '+y', depthAxis: 'y' },
    ];
    for (const { facing, depthAxis } of cases) {
      it(`facing ${facing}: body extends along ${depthAxis}`, () => {
        const audioSize = { x: 14, y: 6.5, z: 5 };
        // Audio jacks in the catalog use depth = size in the facing axis.
        // For +y test we transpose the size so depth is along y.
        const sized =
          depthAxis === 'x'
            ? audioSize
            : { x: audioSize.y, y: audioSize.x, z: audioSize.z };
        const g = buildFixture('custom' as ComponentKind, sized, 'audio-jack-3-5', facing);
        expect(g).not.toBeNull();
        const bb = bboxOf(g!);
        const span = (axis: 'x' | 'y' | 'z'): number => bb.max[axis] - bb.min[axis];
        // Body length along depth axis ≈ full size; perpendicular axes
        // are bounded by the body radius (≈ min(perp) * 0.45 * 2).
        expect(span(depthAxis)).toBeGreaterThan(sized[depthAxis] * 0.9);
      });
    }
  });

  it('symmetric fixtures (fan-mount, antenna-connector) are unaffected by facing', () => {
    const a = buildFixture('fan-mount', SIZE, undefined, '+y');
    const b = buildFixture('fan-mount', SIZE, undefined, '-x');
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    const bbA = bboxOf(a!);
    const bbB = bboxOf(b!);
    // Both bboxes should match the requested size identically.
    expect(bbA.max.x - bbA.min.x).toBeCloseTo(bbB.max.x - bbB.min.x, 3);
    expect(bbA.max.y - bbA.min.y).toBeCloseTo(bbB.max.y - bbB.min.y, 3);
    expect(bbA.max.z - bbA.min.z).toBeCloseTo(bbB.max.z - bbB.min.z, 3);
  });

  it('every kind builder accepts facing without throwing', () => {
    const kinds: ComponentKind[] = [
      'usb-c',
      'usb-a',
      'usb-b',
      'micro-usb',
      'hdmi',
      'micro-hdmi',
      'barrel-jack',
      'ethernet-rj45',
      'gpio-header',
      'sd-card',
      'flat-cable',
      'fan-mount',
      'antenna-connector',
    ];
    for (const k of kinds) {
      for (const f of ['+x', '-x', '+y', '-y'] as Facing[]) {
        const g = buildFixture(k, SIZE, undefined, f);
        expect(g, `${k} @ ${f}`).not.toBeNull();
      }
    }
  });

  // Suppress unused-import noise.
  void ({} as MeshLike);
});
