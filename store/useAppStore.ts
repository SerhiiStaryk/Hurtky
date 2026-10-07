import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ClassReminderOffset = 0 | 15 | 30 | 60 | 120; // in minutes (0 means at class time)

const THEME_MODE_KEY = 'themeMode';
const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled';
const CLASS_REMINDER_OFFSET_KEY = 'class_reminder_offset';
const PAYMENT_REMINDERS_ENABLED_KEY = 'payment_reminders_enabled';

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

const persistSetting = async (key: string, value: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.warn(`Failed to save ${key}:`, error);
  }
};

export const useAppStore = create<AppStore>(set => ({
  selectedChildId: null,
  setSelectedChildId: id => set({ selectedChildId: id }),
  selectedClubId: null,
  setSelectedClubId: id => set({ selectedClubId: id }),
  themeMode: 'system',
  setThemeMode: mode => {
    set({ themeMode: mode });
    void persistSetting(THEME_MODE_KEY, mode);
  },
  notificationsEnabled: true,
  setNotificationsEnabled: enabled => {
    set({ notificationsEnabled: enabled });
    void persistSetting(NOTIFICATIONS_ENABLED_KEY, String(enabled));
  },
  classReminderOffset: 30,
  setClassReminderOffset: offset => {
    set({ classReminderOffset: offset });
    void persistSetting(CLASS_REMINDER_OFFSET_KEY, String(offset));
  },
  paymentRemindersEnabled: true,
  setPaymentRemindersEnabled: enabled => {
    set({ paymentRemindersEnabled: enabled });
    void persistSetting(PAYMENT_REMINDERS_ENABLED_KEY, String(enabled));
  },
}));
