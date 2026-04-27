import { useProjectStore } from '@/store/projectStore';
import { useJobStore } from '@/store/jobStore';
import { exportStlBinary, exportStlAscii, exportThreeMf } from '@/engine/jobs/workerClient';
import { scheduleImmediate, waitForIdle } from '@/engine/jobs/JobScheduler';
import type { StlMeshInput } from '@/workers/export/stlBinary';

export type ExportFormat = 'stl-binary' | 'stl-ascii' | '3mf';

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

export async function triggerExport(format: ExportFormat): Promise<void> {
  const project = useProjectStore.getState().project;
  await scheduleImmediate(project);
  await waitForIdle();
  const nodes = useJobStore.getState().nodes;
  const meshes: StlMeshInput[] = [];
  for (const n of nodes.values()) {
    meshes.push({ positions: n.buffer.positions, indices: n.buffer.indices });
  }
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
