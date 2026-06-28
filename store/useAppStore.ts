import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ClassReminderOffset = 0 | 15 | 30 | 60 | 120; // in minutes (0 means at class time)

interface AppStore {
  selectedChildId: number | null;
  setSelectedChildId: (id: number | null) => void;
  selectedClubId: number | null;
  setSelectedClubId: (id: number | null) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  classReminderOffset: ClassReminderOffset;
  setClassReminderOffset: (offset: ClassReminderOffset) => void;
  paymentRemindersEnabled: boolean;
  setPaymentRemindersEnabled: (enabled: boolean) => void;
}

export const useAppStore = create<AppStore>(set => ({
  selectedChildId: null,
  setSelectedChildId: id => set({ selectedChildId: id }),
  selectedClubId: null,
  setSelectedClubId: id => set({ selectedClubId: id }),
  themeMode: 'system',
  setThemeMode: mode => set({ themeMode: mode }),
  notificationsEnabled: true,
  setNotificationsEnabled: enabled => set({ notificationsEnabled: enabled }),
  classReminderOffset: 30,
  setClassReminderOffset: offset => set({ classReminderOffset: offset }),
  paymentRemindersEnabled: true,
  setPaymentRemindersEnabled: enabled => set({ paymentRemindersEnabled: enabled }),
}));
