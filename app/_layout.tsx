import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getStoredThemeMode, useColorScheme } from '@/hooks/use-color-scheme';
import { initializeDatabase } from '@/lib/db';
import { useAppStore } from '@/store/useAppStore';
import {
  getStoredNotificationSettings,
  requestPermissionsAsync,
  rescheduleAllNotifications,
} from '@/lib/notifications';
import * as Notifications from 'expo-notifications';

LogBox.ignoreLogs([
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'expo-notifications: Android Push notifications',
]);

const queryClient = new QueryClient();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const setThemeMode = useAppStore(state => state.setThemeMode);
  const setNotificationsEnabled = useAppStore(state => state.setNotificationsEnabled);
  const setClassReminderOffset = useAppStore(state => state.setClassReminderOffset);
  const setPaymentRemindersEnabled = useAppStore(state => state.setPaymentRemindersEnabled);
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    async function prepare() {
      try {
        const storedThemeMode = await getStoredThemeMode();
        setThemeMode(storedThemeMode);
        
        // Hydrate notification settings
        const notifSettings = await getStoredNotificationSettings();
        setNotificationsEnabled(notifSettings.notificationsEnabled);
        setClassReminderOffset(notifSettings.classReminderOffset as any);
        setPaymentRemindersEnabled(notifSettings.paymentRemindersEnabled);

        await initializeDatabase();

        // If enabled, request permission and schedule
        if (notifSettings.notificationsEnabled) {
          const granted = await requestPermissionsAsync();
          if (granted) {
            await rescheduleAllNotifications();
          }
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, [setThemeMode, setNotificationsEnabled, setClassReminderOffset, setPaymentRemindersEnabled]);

  useEffect(() => {
    // Handle tap/click on notifications
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data && data.clubId) {
        router.push({ pathname: '/club/[id]', params: { id: data.clubId.toString() } });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <QueryClientProvider client={queryClient}>
            <Stack>
              <Stack.Screen
                name='(tabs)'
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name='modal'
                options={{ presentation: 'modal', title: 'Модальне вікно' }}
              />
            </Stack>
          </QueryClientProvider>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
