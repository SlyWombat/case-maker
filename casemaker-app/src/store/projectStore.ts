import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { temporal } from 'zundo';
import { produce } from 'immer';
import type {
  Project,
  BoardProfile,
  CaseParameters,
  PortPlacement,
  BoardComponent,
  ComponentKind,
  Facing,
} from '@/types';
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
  cloneBoardForEditing: () => void;
  patchBoardPcb: (patch: { x?: number; y?: number; z?: number }) => void;
  addMountingHole: () => void;
  removeMountingHole: (holeId: string) => void;
  patchMountingHole: (
    holeId: string,
    patch: { x?: number; y?: number; diameter?: number },
  ) => void;
  addExternalAsset: (asset: import('@/types').ExternalAsset) => void;
  removeExternalAsset: (assetId: string) => void;
  patchExternalAsset: (
    assetId: string,
    patch: Partial<import('@/types').ExternalAsset>,
  ) => void;
  addComponent: () => void;
  removeComponent: (componentId: string) => void;
  patchComponent: (
    componentId: string,
    patch: {
      kind?: ComponentKind;
      position?: Partial<{ x: number; y: number; z: number }>;
      size?: Partial<{ x: number; y: number; z: number }>;
      facing?: Facing;
      cutoutMargin?: number;
    },
  ) => void;
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
        cloneBoardForEditing: () =>
          set((s) => ({
            project: produce(s.project, (draft) => {
              if (!draft.board.builtin) return;
              draft.board.id = `custom-${draft.board.id}-${newId()}`;
              draft.board.name = `${draft.board.name} (custom)`;
              draft.board.builtin = false;
              delete draft.board.source;
            }),
          })),
        patchBoardPcb: (patch) =>
          set((s) => ({
            project: produce(s.project, (draft) => {
              if (draft.board.builtin) return;
              if (typeof patch.x === 'number') draft.board.pcb.size.x = patch.x;
              if (typeof patch.y === 'number') draft.board.pcb.size.y = patch.y;
              if (typeof patch.z === 'number') draft.board.pcb.size.z = patch.z;
            }),
          })),
        addMountingHole: () =>
          set((s) => ({
            project: produce(s.project, (draft) => {
              if (draft.board.builtin) return;
              draft.board.mountingHoles.push({
                id: `h-${newId()}`,
                x: draft.board.pcb.size.x / 2,
                y: draft.board.pcb.size.y / 2,
                diameter: 2.75,
              });
            }),
          })),
        removeMountingHole: (holeId) =>
          set((s) => ({
            project: produce(s.project, (draft) => {
              if (draft.board.builtin) return;
              draft.board.mountingHoles = draft.board.mountingHoles.filter(
                (h) => h.id !== holeId,
              );
            }),
          })),
        patchMountingHole: (holeId, patch) =>
          set((s) => ({
            project: produce(s.project, (draft) => {
              if (draft.board.builtin) return;
              const h = draft.board.mountingHoles.find((m) => m.id === holeId);
              if (!h) return;
              if (typeof patch.x === 'number') h.x = patch.x;
              if (typeof patch.y === 'number') h.y = patch.y;
              if (typeof patch.diameter === 'number') h.diameter = patch.diameter;
            }),
          })),
        addExternalAsset: (asset) =>
          set((s) => ({
            project: produce(s.project, (draft) => {
              draft.externalAssets.push(asset);
            }),
          })),
        removeExternalAsset: (assetId) =>
          set((s) => ({
            project: produce(s.project, (draft) => {
              draft.externalAssets = draft.externalAssets.filter((a) => a.id !== assetId);
            }),
          })),
        patchExternalAsset: (assetId, patch) =>
          set((s) => ({
            project: produce(s.project, (draft) => {
              const a = draft.externalAssets.find((x) => x.id === assetId);
              if (!a) return;
              Object.assign(a, patch);
            }),
          })),
        addComponent: () =>
          set((s) => ({
            project: produce(s.project, (draft) => {
              if (draft.board.builtin) return;
              const newComp: BoardComponent = {
                id: `c-${newId()}`,
                kind: 'custom',
                position: { x: 0, y: 0, z: draft.board.pcb.size.z },
                size: { x: 5, y: 5, z: 5 },
                facing: '+y',
                cutoutMargin: 0.5,
              };
              draft.board.components.push(newComp);
            }),
          })),
        removeComponent: (componentId) =>
          set((s) => ({
            project: produce(s.project, (draft) => {
              if (draft.board.builtin) return;
              draft.board.components = draft.board.components.filter(
                (c) => c.id !== componentId,
              );
              draft.ports = draft.ports.filter((p) => p.sourceComponentId !== componentId);
            }),
          })),
        patchComponent: (componentId, patch) =>
          set((s) => ({
            project: produce(s.project, (draft) => {
              if (draft.board.builtin) return;
              const c = draft.board.components.find((x) => x.id === componentId);
              if (!c) return;
              if (patch.kind) c.kind = patch.kind;
              if (patch.facing) c.facing = patch.facing;
              if (typeof patch.cutoutMargin === 'number') c.cutoutMargin = patch.cutoutMargin;
              if (patch.position) {
                if (typeof patch.position.x === 'number') c.position.x = patch.position.x;
                if (typeof patch.position.y === 'number') c.position.y = patch.position.y;
                if (typeof patch.position.z === 'number') c.position.z = patch.position.z;
              }
              if (patch.size) {
                if (typeof patch.size.x === 'number') c.size.x = patch.size.x;
                if (typeof patch.size.y === 'number') c.size.y = patch.size.y;
                if (typeof patch.size.z === 'number') c.size.z = patch.size.z;
              }
              const matchingPort = draft.ports.find((p) => p.sourceComponentId === componentId);
              if (matchingPort) {
                if (patch.kind) matchingPort.kind = patch.kind;
                if (patch.facing) matchingPort.facing = patch.facing;
                if (typeof patch.cutoutMargin === 'number')
                  matchingPort.cutoutMargin = patch.cutoutMargin;
                if (patch.position) Object.assign(matchingPort.position, patch.position);
                if (patch.size) Object.assign(matchingPort.size, patch.size);
              }
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
