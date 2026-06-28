import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { ThemeMode, setStoredThemeMode, useColorScheme } from '@/hooks/use-color-scheme';
import { pickAndImportBackup, saveAndShareBackup } from '@/lib/share';
import { useAppStore, ClassReminderOffset } from '@/store/useAppStore';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  rescheduleAllNotifications,
  requestPermissionsAsync,
  setStoredNotificationsEnabled,
  setStoredClassReminderOffset,
  setStoredPaymentRemindersEnabled,
} from '@/lib/notifications';
import * as Notifications from 'expo-notifications';

const ToggleSwitch = ({ value, onValueChange, colors }: { value: boolean; onValueChange: () => void; colors: any }) => (
  <Pressable
    onPress={onValueChange}
    style={{
      width: 50,
      height: 28,
      borderRadius: 14,
      backgroundColor: value ? colors.tint : (colors.border || '#ccc'),
      padding: 2,
      justifyContent: 'center',
    }}
  >
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        alignSelf: value ? 'flex-end' : 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
      }}
    />
  </Pressable>
);

type ThemeOption = {
  value: ThemeMode;
  label: string;
};

const themeOptions: ThemeOption[] = [
  { value: 'system', label: 'Система' },
  { value: 'light', label: 'Світла' },
  { value: 'dark', label: 'Темна' },
];

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const queryClient = useQueryClient();

  const themeMode = useAppStore(state => state.themeMode);
  const setThemeMode = useAppStore(state => state.setThemeMode);

  const notificationsEnabled = useAppStore(state => state.notificationsEnabled);
  const setNotificationsEnabled = useAppStore(state => state.setNotificationsEnabled);
  const classReminderOffset = useAppStore(state => state.classReminderOffset);
  const setClassReminderOffset = useAppStore(state => state.setClassReminderOffset);
  const paymentRemindersEnabled = useAppStore(state => state.paymentRemindersEnabled);
  const setPaymentRemindersEnabled = useAppStore(state => state.setPaymentRemindersEnabled);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<boolean | null>(null);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  useEffect(() => {
    async function checkPermission() {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status === 'granted');
    }
    checkPermission();
  }, []);

  const offsetOptions: { value: ClassReminderOffset; label: string }[] = [
    { value: 0, label: 'Вчасно' },
    { value: 15, label: '15 хв' },
    { value: 30, label: '30 хв' },
    { value: 60, label: '1 год' },
    { value: 120, label: '2 год' },
  ];

  const handleRequestPermission = async () => {
    const granted = await requestPermissionsAsync();
    setPermissionStatus(granted);
    if (granted) {
      Alert.alert('Успішно', 'Дозвіл на сповіщення надано!');
      await rescheduleAllNotifications();
    } else {
      Alert.alert('Помилка', 'Не вдалося отримати дозвіл на сповіщення.');
    }
  };

  const handleToggleNotifications = async () => {
    const nextValue = !notificationsEnabled;
    if (nextValue) {
      const granted = await requestPermissionsAsync();
      setPermissionStatus(granted);
      if (!granted) {
        Alert.alert('Помилка', 'Будь ласка, дозвольте надсилання сповіщень у налаштуваннях пристрою.');
        return;
      }
    }
    setNotificationsEnabled(nextValue);
    await setStoredNotificationsEnabled(nextValue);
    await rescheduleAllNotifications();
  };

  const handleOffsetChange = async (offset: ClassReminderOffset) => {
    setClassReminderOffset(offset);
    await setStoredClassReminderOffset(offset);
    await rescheduleAllNotifications();
  };

  const handleTogglePaymentReminders = async () => {
    const nextValue = !paymentRemindersEnabled;
    setPaymentRemindersEnabled(nextValue);
    await setStoredPaymentRemindersEnabled(nextValue);
    await rescheduleAllNotifications();
  };

  const handleThemeModeChange = async (mode: ThemeMode) => {
    if (mode === themeMode) {
      return;
    }

    setIsSavingTheme(true);
    try {
      await setStoredThemeMode(mode);
      setThemeMode(mode);
    } catch (error: any) {
      Alert.alert('Помилка', error?.message ?? 'Не вдалося зберегти тему');
    } finally {
      setIsSavingTheme(false);
    }
  };

  const handleExport = async () => {
    Alert.alert(
      'Увага',
      'Резервна копія містить персональні дані. IBAN та реквізити карток також зберігаються у файлі, тому передавайте його лише довіреним особам.',
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Продовжити',
          onPress: async () => {
            setIsExporting(true);
            try {
              await saveAndShareBackup();
              setExportSuccess(true);
              setTimeout(() => setExportSuccess(false), 2000);
            } catch (error: any) {
              Alert.alert('Помилка', error?.message ?? 'Не вдалося експортувати резервну копію');
            } finally {
              setIsExporting(false);
            }
          },
        },
      ],
    );
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const result = await pickAndImportBackup();
      if (result.canceled) {
        return;
      }

      if (result.errors.length > 0) {
        Alert.alert('Помилка', result.errors.join('\n'));
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ['children'] });
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
      await rescheduleAllNotifications();
      Alert.alert('Імпортовано!', `Додано дітей: ${result.imported}`);
    } catch (error: any) {
      Alert.alert('Помилка', error?.message ?? 'Не вдалося імпортувати резервну копію');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText style={styles.sectionTitle}>Резервна копія</ThemedText>

          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle}>Експорт даних</ThemedText>
              <ThemedText style={[styles.cardSubtitle, { color: colors.icon }]}>
                Зберегти всіх дітей та гуртки у файл
              </ThemedText>
            </View>

            {exportSuccess ? (
              <View style={styles.successBanner}>
                <ThemedText style={styles.successText}>Готово!</ThemedText>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.button, { backgroundColor: colors.tint, opacity: pressed ? 0.8 : 1 }]}
              onPress={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator color='#fff' />
              ) : (
                <ThemedText style={styles.buttonText}>Поділитись файлом</ThemedText>
              )}
            </Pressable>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle}>Імпорт даних</ThemedText>
              <ThemedText style={[styles.cardSubtitle, { color: colors.icon }]}>
                Відновити з резервної копії .json
              </ThemedText>
            </View>

            <View style={styles.warningBox}>
              <ThemedText style={styles.warningText}>Дані будуть ДОДАНІ до існуючих, не замінять їх</ThemedText>
            </View>

            <Pressable
              style={({ pressed }) => [styles.button, { backgroundColor: colors.tint, opacity: pressed ? 0.8 : 1 }]}
              onPress={handleImport}
              disabled={isImporting}
            >
              {isImporting ? (
                <ActivityIndicator color='#fff' />
              ) : (
                <ThemedText style={styles.buttonText}>Обрати файл</ThemedText>
              )}
            </Pressable>
          </View>

          <ThemedText style={[styles.sectionTitle, { marginTop: 24 }]}>Сповіщення</ThemedText>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>Дозвіл на сповіщення</ThemedText>
                <ThemedText style={[styles.settingSubtitle, { color: colors.icon }]}>
                  {permissionStatus === true ? 'Надано' : permissionStatus === false ? 'Не надано' : 'Перевірка...'}
                </ThemedText>
              </View>
              {permissionStatus !== true && (
                <Pressable
                  style={({ pressed }) => [
                    styles.permissionButton,
                    { backgroundColor: colors.tint, opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={handleRequestPermission}
                >
                  <ThemedText style={styles.permissionButtonText}>Надати</ThemedText>
                </Pressable>
              )}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>Увімкнути сповіщення</ThemedText>
                <ThemedText style={[styles.settingSubtitle, { color: colors.icon }]}>
                  Надсилати нагадування про заняття та оплату
                </ThemedText>
              </View>
              <ToggleSwitch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                colors={colors}
              />
            </View>

            {notificationsEnabled && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.settingCol}>
                  <ThemedText style={styles.settingTitle}>Час нагадування про заняття</ThemedText>
                  <ThemedText style={[styles.settingSubtitle, { color: colors.icon, marginBottom: 12 }]}>
                    За скільки часу до початку заняття надіслати сповіщення
                  </ThemedText>

                  <View style={styles.offsetOptions}>
                    {offsetOptions.map(option => {
                      const isActive = option.value === classReminderOffset;
                      return (
                        <Pressable
                          key={option.value}
                          onPress={() => handleOffsetChange(option.value)}
                          style={({ pressed }) => [
                            styles.offsetOption,
                            {
                              borderColor: isActive ? colors.tint : colors.border,
                              backgroundColor: isActive ? colors.tint : 'transparent',
                              opacity: pressed ? 0.8 : 1,
                            },
                          ]}
                        >
                          <ThemedText style={[styles.offsetOptionText, { color: isActive ? '#fff' : colors.text }]}>
                            {option.label}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <ThemedText style={styles.settingTitle}>Нагадування про оплату</ThemedText>
                    <ThemedText style={[styles.settingSubtitle, { color: colors.icon }]}>
                      Нагадувати в день оплати гуртка о 9:00
                    </ThemedText>
                  </View>
                  <ToggleSwitch
                    value={paymentRemindersEnabled}
                    onValueChange={handleTogglePaymentReminders}
                    colors={colors}
                  />
                </View>
              </>
            )}
          </View>

          <ThemedText style={[styles.sectionTitle, { marginTop: 24 }]}>Оформлення</ThemedText>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle}>Тема</ThemedText>
              <ThemedText style={[styles.cardSubtitle, { color: colors.icon }]}>
                Виберіть оформлення інтерфейсу
              </ThemedText>
            </View>

            <View style={styles.themeOptions}>
              {themeOptions.map(option => {
                const isActive = option.value === themeMode;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => handleThemeModeChange(option.value)}
                    style={({ pressed }) => [
                      styles.themeOption,
                      {
                        borderColor: isActive ? colors.tint : colors.border,
                        backgroundColor: isActive ? colors.tint : 'transparent',
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    disabled={isSavingTheme}
                  >
                    <ThemedText style={[styles.themeOptionText, { color: isActive ? '#fff' : colors.text }]}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <ThemedText style={[styles.sectionTitle, { marginTop: 24 }]}>Про додаток</ThemedText>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.rowItem}>
              <ThemedText style={[styles.rowLabel, { color: colors.icon }]}>Версія</ThemedText>
              <ThemedText style={styles.rowValue}>{appVersion}</ThemedText>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.5,
    marginBottom: 12,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  button: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  warningText: {
    color: '#92400E',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  successBanner: {
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  successText: {
    color: '#166534',
    fontWeight: '800',
    fontSize: 13,
  },
  themeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  themeOption: {
    flex: 1,
    maxWidth: 120,
    minWidth: 90,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 10,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowLabel: {
    fontSize: 16,
  },
  rowValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  settingCol: {
    paddingVertical: 6,
  },
  settingInfo: {
    flex: 1,
    paddingRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  permissionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  offsetOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  offsetOption: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  offsetOptionText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
