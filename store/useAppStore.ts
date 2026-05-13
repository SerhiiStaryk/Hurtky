import { create } from 'zustand';

interface AppStore {
  selectedChildId: number | null;
  setSelectedChildId: (id: number | null) => void;
  selectedClubId: number | null;
  setSelectedClubId: (id: number | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  selectedChildId: null,
  setSelectedChildId: (id) => set({ selectedChildId: id }),
  selectedClubId: null,
  setSelectedClubId: (id) => set({ selectedClubId: id }),
}));
