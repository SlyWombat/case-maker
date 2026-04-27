import type { ExternalAsset } from '@/types';
import { mesh, rotate, scale, translate, type BuildOp } from './buildPlan';
import { decodeAssetMesh } from '@/engine/import/assetImporter';

interface AssetGroups {
  unionOps: BuildOp[];
  subtractOps: BuildOp[];
}

function applyTransforms(asset: ExternalAsset, op: BuildOp): BuildOp {
  let result = op;
  if (asset.transform.scale !== 1) {
    result = scale(asset.transform.scale, result);
  }
  const [rx, ry, rz] = asset.transform.rotation;
  if (rx !== 0 || ry !== 0 || rz !== 0) {
    result = rotate([rx, ry, rz], result);
  }
  const [tx, ty, tz] = asset.transform.position;
  if (tx !== 0 || ty !== 0 || tz !== 0) {
    result = translate([tx, ty, tz], result);
  }
  return result;
}

export function buildExternalAssetOps(assets: ExternalAsset[]): AssetGroups {
  const unionOps: BuildOp[] = [];
  const subtractOps: BuildOp[] = [];
  for (const asset of assets) {
    if (asset.visibility === 'reference') continue;
    let parsed;
    try {
      parsed = decodeAssetMesh(asset);
    } catch {
      continue;
    }
    const meshOp = mesh(parsed.positions.slice(), parsed.indices.slice());
    const transformed = applyTransforms(asset, meshOp);
    if (asset.visibility === 'union') unionOps.push(transformed);
    else if (asset.visibility === 'subtract') subtractOps.push(transformed);
  }
  return { unionOps, subtractOps };
}
