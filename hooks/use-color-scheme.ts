import { ThemeMode, useAppStore } from '@/store/useAppStore';
import * as SecureStore from 'expo-secure-store';
import { ColorSchemeName, useColorScheme as useRNColorScheme } from 'react-native';

const THEME_MODE_KEY = 'themeMode';

export async function getStoredThemeMode(): Promise<ThemeMode> {
  try {
    const value = await SecureStore.getItemAsync(THEME_MODE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') {
      return value;
    }
  } catch (error) {
    console.warn('Failed to load theme mode', error);
  }

  return 'system';
}

export async function setStoredThemeMode(mode: ThemeMode): Promise<void> {
  try {
    await SecureStore.setItemAsync(THEME_MODE_KEY, mode);
  } catch (error) {
    console.warn('Failed to save theme mode', error);
  }
}

export { ThemeMode } from '@/store/useAppStore';

export function useColorScheme(): ColorSchemeName {
  const systemColorScheme = useRNColorScheme();
  const themeMode = useAppStore(state => state.themeMode);

  if (themeMode === 'light' || themeMode === 'dark') {
    return themeMode;
  }

  return systemColorScheme ?? 'light';
}
