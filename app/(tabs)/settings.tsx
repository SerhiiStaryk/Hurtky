import { useState } from 'react';
import { Alert, ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, View, Pressable } from 'react-native';
import Constants from 'expo-constants';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { pickAndImportBackup, saveAndShareBackup } from '@/lib/share';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const queryClient = useQueryClient();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const handleExport = async () => {
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
      Alert.alert('Імпортовано!', `Додано дітей: ${result.imported}`);
    } catch (error: any) {
      Alert.alert('Помилка', error?.message ?? 'Не вдалося імпортувати резервну копію');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}> 
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Резервна копія</ThemedText>

          <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.tint }]}> 
            <View style={styles.cardHeader}>
              <ThemedText style={[styles.cardTitle, { color: colors.text }]}>Експорт даних</ThemedText>
              <ThemedText style={[styles.cardSubtitle, { color: colors.icon }]}>Зберегти всіх дітей та гуртки у файл</ThemedText>
            </View>

            {exportSuccess ? (
              <View style={styles.successBanner}>
                <ThemedText style={styles.successText}>Готово!</ThemedText>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.tint, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>Поділитись файлом</ThemedText>
              )}
            </Pressable>
          </View>

          <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.tint }]}> 
            <View style={styles.cardHeader}>
              <ThemedText style={[styles.cardTitle, { color: colors.text }]}>Імпорт даних</ThemedText>
              <ThemedText style={[styles.cardSubtitle, { color: colors.icon }]}>Відновити з резервної копії .json</ThemedText>
            </View>

            <View style={styles.warningBox}>
              <ThemedText style={styles.warningText}>
                Дані будуть ДОДАНІ до існуючих, не замінять їх
              </ThemedText>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.tint, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={handleImport}
              disabled={isImporting}
            >
              {isImporting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>Обрати файл</ThemedText>
              )}
            </Pressable>
          </View>

          <ThemedText style={[styles.sectionTitle, { color: colors.text, marginTop: 32 }]}>Про додаток</ThemedText>
          <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.tint }]}> 
            <View style={styles.rowItem}>
              <ThemedText style={[styles.rowLabel, { color: colors.icon }]}>Версія</ThemedText>
              <ThemedText style={[styles.rowValue, { color: colors.text }]}>{appVersion}</ThemedText>
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  warningText: {
    color: '#92400e',
    fontSize: 14,
    lineHeight: 20,
  },
  successBanner: {
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  successText: {
    color: '#166534',
    fontWeight: '700',
    fontSize: 14,
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
});
