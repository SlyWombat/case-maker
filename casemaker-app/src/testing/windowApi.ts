import type { Project, MeshStats } from '@/types';
import {
  useProjectStore,
  undoProject,
  redoProject,
  canUndo,
  canRedo,
  clearHistory,
} from '@/store/projectStore';
import { useJobStore } from '@/store/jobStore';
import {
  setDebounce,
  getDebounce,
  getGeneration,
  scheduleImmediate,
  waitForIdle,
} from '@/engine/jobs/JobScheduler';
import { resetSeed, setSeededIds } from '@/utils/id';
import { triggerExport } from '@/engine/exportTrigger';
import { isZUp } from '@/engine/coords';
import { serializeProject, parseProject } from '@/store/persistence';

export interface SceneNodeSummary {
  id: string;
  triangleCount: number;
  vertexCount: number;
  bbox: { min: [number, number, number]; max: [number, number, number] };
}

export interface CaseMakerTestApi {
  apiVersion: 1;
  isTestMode(): boolean;
  isZUp(): boolean;
  getProject(): Project;
  setProject(p: Project): Promise<void>;
  patchCase(patch: Partial<Project['case']>): Promise<void>;
  loadBuiltinBoard(id: string): Promise<void>;
  getMeshStats(node: 'shell' | 'lid' | 'all'): MeshStats | null;
  getSceneGraph(): SceneNodeSummary[];
  setDebounce(ms: number): void;
  getDebounce(): number;
  getGeneration(): number;
  waitForIdle(): Promise<void>;
  triggerExport(format: 'stl' | '3mf'): Promise<void>;
  resetSeed(seed?: number): void;
  serializeProject(): string;
  loadSerializedProject(json: string): Promise<void>;
  undo(): Promise<void>;
  redo(): Promise<void>;
  canUndo(): boolean;
  canRedo(): boolean;
  clearHistory(): void;
}

export function installCaseMakerTestApi(): void {
  if (typeof window === 'undefined') return;
  const isE2E = import.meta.env.VITE_E2E === '1' || import.meta.env.MODE === 'test';
  if (isE2E) {
    setSeededIds(true);
    setDebounce(0);
  }

  const api: CaseMakerTestApi = {
    apiVersion: 1,
    isTestMode: () => isE2E,
    isZUp,
    getProject: () => useProjectStore.getState().project,
    async setProject(p) {
      useProjectStore.getState().setProject(p);
      await scheduleImmediate(p);
      await waitForIdle();
    },
    async patchCase(patch) {
      useProjectStore.getState().patchCase(patch);
      await waitForIdle();
    },
    async loadBuiltinBoard(id) {
      useProjectStore.getState().loadBuiltinBoard(id);
      await waitForIdle();
    },
    getMeshStats(node) {
      const job = useJobStore.getState();
      if (node === 'all') return job.combinedStats;
      const n = job.nodes.get(node);
      return n ? n.stats : null;
    },
    getSceneGraph() {
      const job = useJobStore.getState();
      const out: SceneNodeSummary[] = [];
      for (const n of job.nodes.values()) {
        out.push({
          id: n.id,
          triangleCount: n.stats.triangleCount,
          vertexCount: n.stats.vertexCount,
          bbox: n.stats.bbox,
        });
      }
      return out;
    },
    setDebounce,
    getDebounce,
    getGeneration,
    waitForIdle,
    triggerExport,
    resetSeed: (seed = 0) => resetSeed(seed),
    serializeProject: () => serializeProject(useProjectStore.getState().project),
    async loadSerializedProject(json: string) {
      const p = parseProject(json);
      useProjectStore.getState().setProject(p);
      clearHistory();
      await scheduleImmediate(p);
      await waitForIdle();
    },
    async undo() {
      undoProject();
      await waitForIdle();
    },
    async redo() {
      redoProject();
      await waitForIdle();
    },
    canUndo,
    canRedo,
    clearHistory,
  };

  (window as unknown as { __caseMaker: CaseMakerTestApi }).__caseMaker = api;
}

declare global {
  interface Window {
    __caseMaker?: CaseMakerTestApi;
  }
}
