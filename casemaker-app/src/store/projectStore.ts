import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { temporal } from 'zundo';
import { produce } from 'immer';
import type { Project, BoardProfile, CaseParameters, PortPlacement } from '@/types';
import { getBuiltinBoard } from '@/library';
import { newId } from '@/utils/id';
import { autoPortsForBoard } from '@/engine/compiler/portFactory';

const DEFAULT_BOARD_ID = 'rpi-4b';

function defaultCase(): CaseParameters {
  return {
    wallThickness: 2,
    floorThickness: 2,
    lidThickness: 2,
    cornerRadius: 2,
    internalClearance: 0.5,
    zClearance: 5,
    joint: 'flat-lid',
    ventilation: { enabled: false, pattern: 'none', coverage: 0 },
    bosses: {
      enabled: true,
      insertType: 'self-tap',
      outerDiameter: 5,
      holeDiameter: 2.5,
    },
  };
}

export function createDefaultProject(boardId = DEFAULT_BOARD_ID): Project {
  const board = getBuiltinBoard(boardId);
  if (!board) throw new Error(`Unknown built-in board: ${boardId}`);
  const now = new Date(0).toISOString();
  return {
    schemaVersion: 1,
    id: newId('proj'),
    name: `${board.name} Case`,
    createdAt: now,
    modifiedAt: now,
    board: structuredClone(board),
    case: defaultCase(),
    ports: autoPortsForBoard(board),
    externalAssets: [],
  };
}

export interface ProjectState {
  project: Project;
  setProject: (p: Project) => void;
  patchCase: (patch: Partial<CaseParameters>) => void;
  loadBuiltinBoard: (boardId: string) => void;
  addPort: (port: PortPlacement) => void;
  removePort: (portId: string) => void;
  setPortEnabled: (portId: string, enabled: boolean) => void;
  setBoard: (board: BoardProfile) => void;
}

export const useProjectStore = create<ProjectState>()(
  subscribeWithSelector(
    temporal(
      (set) => ({
        project: createDefaultProject(),
        setProject: (p) => set({ project: p }),
        patchCase: (patch) =>
          set((s) => ({
            project: produce(s.project, (draft) => {
              for (const [k, v] of Object.entries(patch) as [keyof CaseParameters, unknown][]) {
                (draft.case as Record<string, unknown>)[k as string] = v;
              }
              draft.modifiedAt = new Date(0).toISOString();
            }),
          })),
        loadBuiltinBoard: (boardId) =>
          set(() => ({ project: createDefaultProject(boardId) })),
        addPort: (port) =>
          set((s) => ({
            project: produce(s.project, (draft) => {
              draft.ports.push(port);
            }),
          })),
        removePort: (portId) =>
          set((s) => ({
            project: produce(s.project, (draft) => {
              draft.ports = draft.ports.filter((p) => p.id !== portId);
            }),
          })),
        setPortEnabled: (portId, enabled) =>
          set((s) => ({
            project: produce(s.project, (draft) => {
              const p = draft.ports.find((x) => x.id === portId);
              if (p) p.enabled = enabled;
            }),
          })),
        setBoard: (board) =>
          set((s) => ({
            project: produce(s.project, (draft) => {
              draft.board = structuredClone(board);
            }),
          })),
      }),
      {
        partialize: (state) => ({ project: state.project }),
        limit: 50,
      },
    ),
  ),
);

export function undoProject(): void {
  useProjectStore.temporal.getState().undo();
}

export function redoProject(): void {
  useProjectStore.temporal.getState().redo();
}

export function canUndo(): boolean {
  return useProjectStore.temporal.getState().pastStates.length > 0;
}

export function canRedo(): boolean {
  return useProjectStore.temporal.getState().futureStates.length > 0;
}

export function clearHistory(): void {
  useProjectStore.temporal.getState().clear();
}
