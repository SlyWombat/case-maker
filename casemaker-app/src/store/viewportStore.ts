import { create } from 'zustand';

export interface ViewportState {
  showLid: boolean;
  showBoard: boolean;
  showGrid: boolean;
  selectedPortId: string | null;
  setShowLid: (v: boolean) => void;
  setShowBoard: (v: boolean) => void;
  setShowGrid: (v: boolean) => void;
  selectPort: (id: string | null) => void;
}

export const useViewportStore = create<ViewportState>()((set) => ({
  showLid: true,
  showBoard: true,
  showGrid: true,
  selectedPortId: null,
  setShowLid: (v) => set({ showLid: v }),
  setShowBoard: (v) => set({ showBoard: v }),
  setShowGrid: (v) => set({ showGrid: v }),
  selectPort: (id) => set({ selectedPortId: id }),
}));
