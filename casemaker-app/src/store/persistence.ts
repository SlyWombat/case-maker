import type { Project } from '@/types';
import { projectSchema } from './projectSchema';

export function serializeProject(project: Project): string {
  return JSON.stringify(project, null, 2);
}

export function parseProject(text: string): Project {
  const raw = JSON.parse(text);
  const parsed = projectSchema.parse(raw);
  return parsed as Project;
}

export function downloadProjectJson(project: Project): void {
  const text = serializeProject(project);
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = project.name.replace(/[^a-z0-9-_]+/gi, '_');
  a.href = url;
  a.download = `${safeName}.caseproj.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readProjectFromFile(file: File): Promise<Project> {
  const text = await file.text();
  return parseProject(text);
}
