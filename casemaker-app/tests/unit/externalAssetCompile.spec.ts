import { describe, it, expect } from 'vitest';
import { buildExternalAssetOps } from '@/engine/compiler/externalAssets';
import { collectMeshTransferables } from '@/engine/compiler/buildPlan';
import { arrayBufferToBase64 } from '@/engine/import/base64';
import { buildBinaryStl } from '@/workers/export/stlBinary';
import type { ExternalAsset } from '@/types';

function makeAsset(visibility: ExternalAsset['visibility']): ExternalAsset {
  const tet = {
    positions: new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10]),
    indices: new Uint32Array([0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3]),
  };
  const buf = buildBinaryStl([tet]);
  return {
    id: `asset-${visibility}`,
    name: `tet-${visibility}.stl`,
    format: 'stl',
    data: arrayBufferToBase64(buf),
    transform: { position: [5, 5, 5], rotation: [0, 0, 0], scale: 1 },
    visibility,
  };
}

describe('external asset compilation', () => {
  it('reference-visibility assets produce no build ops', () => {
    const groups = buildExternalAssetOps([makeAsset('reference')]);
    expect(groups.unionOps.length).toBe(0);
    expect(groups.subtractOps.length).toBe(0);
  });

  it('subtract assets add to subtractOps with mesh leaf', () => {
    const groups = buildExternalAssetOps([makeAsset('subtract')]);
    expect(groups.subtractOps.length).toBe(1);
    const transferables = collectMeshTransferables(groups.subtractOps[0]!);
    expect(transferables.length).toBe(2);
  });

  it('union assets add to unionOps with mesh leaf', () => {
    const groups = buildExternalAssetOps([makeAsset('union')]);
    expect(groups.unionOps.length).toBe(1);
  });

  it('non-identity transforms wrap mesh in translate/scale ops', () => {
    const asset = makeAsset('subtract');
    asset.transform.scale = 2;
    asset.transform.rotation = [0, 90, 0];
    const groups = buildExternalAssetOps([asset]);
    const op = groups.subtractOps[0]!;
    // Outer wrapper is translate (because position is non-zero)
    expect(op.kind).toBe('translate');
  });
});
