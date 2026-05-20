import { ThemeMode, useAppStore } from '@/store/useAppStore';
import { useColorScheme as useRNColorScheme } from 'react-native';

const THEME_MODE_KEY = 'themeMode';

function getStoredThemeModeFromStorage(): ThemeMode {
  try {
    const value = window.localStorage.getItem(THEME_MODE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') {
      return value;
    }
  } catch (error) {
    console.warn('Failed to load theme mode', error);
  }

  return 'system';
}

export async function getStoredThemeMode(): Promise<ThemeMode> {
  return getStoredThemeModeFromStorage();
}

export async function setStoredThemeMode(mode: ThemeMode): Promise<void> {
  try {
    window.localStorage.setItem(THEME_MODE_KEY, mode);
  } catch (error) {
    console.warn('Failed to save theme mode', error);
  }
}

export { ThemeMode } from '@/store/useAppStore';

export function useColorScheme() {
  const systemColorScheme = useRNColorScheme();
  const themeMode = useAppStore(state => state.themeMode);

  if (themeMode === 'light' || themeMode === 'dark') {
    return themeMode;
  }

  return systemColorScheme ?? 'light';
}
