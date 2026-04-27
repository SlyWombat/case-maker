import type { ExternalAsset } from '@/types';
import { arrayBufferToBase64, base64ToArrayBuffer } from './base64';
import { parseStl, type ParsedMesh } from './stlParser';
import { parse3MF } from './threeMfParser';
import { newId } from '@/utils/id';

export async function importStlFile(file: File): Promise<ExternalAsset> {
  const buf = await file.arrayBuffer();
  parseStl(buf); // validate by parsing once
  return {
    id: newId('asset'),
    name: file.name,
    format: 'stl',
    data: arrayBufferToBase64(buf),
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 },
    visibility: 'reference',
  };
}

export async function importThreeMfFile(file: File): Promise<ExternalAsset> {
  const buf = await file.arrayBuffer();
  parse3MF(buf);
  return {
    id: newId('asset'),
    name: file.name,
    format: '3mf',
    data: arrayBufferToBase64(buf),
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 },
    visibility: 'reference',
  };
}

export async function importMeshFile(file: File): Promise<ExternalAsset> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.3mf')) return importThreeMfFile(file);
  return importStlFile(file);
}

const meshCache = new Map<string, ParsedMesh>();

export function decodeAssetMesh(asset: ExternalAsset): ParsedMesh {
  const cached = meshCache.get(asset.id);
  if (cached) return cached;
  const buf = base64ToArrayBuffer(asset.data);
  const parsed = asset.format === '3mf' ? parse3MF(buf) : parseStl(buf);
  meshCache.set(asset.id, parsed);
  return parsed;
}

export function clearAssetMeshCache(): void {
  meshCache.clear();
}
