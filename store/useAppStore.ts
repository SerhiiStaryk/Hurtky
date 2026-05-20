import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';

interface AppStore {
  selectedChildId: number | null;
  setSelectedChildId: (id: number | null) => void;
  selectedClubId: number | null;
  setSelectedClubId: (id: number | null) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useAppStore = create<AppStore>(set => ({
  selectedChildId: null,
  setSelectedChildId: id => set({ selectedChildId: id }),
  selectedClubId: null,
  setSelectedClubId: id => set({ selectedClubId: id }),
  themeMode: 'system',
  setThemeMode: mode => set({ themeMode: mode }),
}));
