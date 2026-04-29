import { useProjectStore } from '@/store/projectStore';
import { useJobStore } from '@/store/jobStore';
import { useSettingsStore, type ExportFormat } from '@/store/settingsStore';
import { exportStlBinary, exportStlAscii, exportThreeMf } from '@/engine/jobs/workerClient';
import { scheduleImmediate, waitForIdle } from '@/engine/jobs/JobScheduler';
import type { StlMeshInput } from '@/workers/export/stlBinary';
import { applyLayoutToMeshes } from '@/engine/exportLayout';
import type { MeshNode } from '@/types';

export type { ExportFormat };

function downloadArrayBuffer(buf: ArrayBuffer, filename: string, mime: string): void {
  const blob = new Blob([buf], { type: mime });
  triggerDownload(blob, filename);
}

function downloadText(text: string, filename: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function meshesForExport(): StlMeshInput[] {
  const layoutMode = useSettingsStore.getState().exportLayout;
  const nodes = useJobStore.getState().nodes;
  const list: MeshNode[] = [];
  for (const n of nodes.values()) list.push(n);
  if (layoutMode === 'assembled') {
    return list.map((n) => ({ positions: n.buffer.positions, indices: n.buffer.indices }));
  }
  // Print-ready: lay parts out flat, lid flipped, side-by-side along +X.
  const laid = applyLayoutToMeshes(list, { flipNodeIds: ['lid'] });
  return laid.map((m) => ({ positions: m.positions, indices: m.indices }));
}

export async function triggerExport(format: ExportFormat): Promise<void> {
  const project = useProjectStore.getState().project;
  await scheduleImmediate(project);
  await waitForIdle();
  const meshes = meshesForExport();
  if (meshes.length === 0) throw new Error('No mesh available to export');
  const safeName = project.name.replace(/[^a-z0-9-_]+/gi, '_');
  if (format === 'stl-binary') {
    const buf = await exportStlBinary(meshes);
    downloadArrayBuffer(buf, `${safeName}.stl`, 'model/stl');
  } else if (format === 'stl-ascii') {
    const text = await exportStlAscii(meshes);
    downloadText(text, `${safeName}.ascii.stl`, 'model/stl');
  } else {
    const buf = await exportThreeMf(meshes);
    downloadArrayBuffer(buf, `${safeName}.3mf`, 'model/3mf');
  }
}
