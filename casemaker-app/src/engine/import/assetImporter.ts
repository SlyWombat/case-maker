import type { ExternalAsset } from '@/types';
import { arrayBufferToBase64, base64ToArrayBuffer } from './base64';
import { parseBinaryStl, looksLikeBinaryStl, type ParsedMesh } from './stlParser';
import { newId } from '@/utils/id';

export async function importStlFile(file: File): Promise<ExternalAsset> {
  const buf = await file.arrayBuffer();
  if (!looksLikeBinaryStl(buf)) {
    throw new Error('Only binary STL is supported in this build (ASCII STL coming soon)');
  }
  // Validate by parsing once before storing.
  parseBinaryStl(buf);
  return {
    id: newId('asset'),
    name: file.name,
    format: 'stl',
    data: arrayBufferToBase64(buf),
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 },
    visibility: 'reference',
  };
}

const meshCache = new Map<string, ParsedMesh>();

export function decodeAssetMesh(asset: ExternalAsset): ParsedMesh {
  const cached = meshCache.get(asset.id);
  if (cached) return cached;
  if (asset.format !== 'stl') {
    throw new Error(`3MF asset decoding is not yet supported (${asset.name})`);
  }
  const buf = base64ToArrayBuffer(asset.data);
  const parsed = parseBinaryStl(buf);
  meshCache.set(asset.id, parsed);
  return parsed;
}

export function clearAssetMeshCache(): void {
  meshCache.clear();
}
