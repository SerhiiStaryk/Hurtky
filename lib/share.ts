import { format } from 'date-fns';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { exportBackup, importBackup } from './backup';

export interface ImportResult {
  imported: number;
  errors: string[];
  canceled?: boolean;
}

export async function saveAndShareBackup(): Promise<void> {
  const json = await exportBackup();
  const filename = `hurtky-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;

  // Web — завантаження через браузер
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }
    return;
  }

  // Native (iOS / Android)
  const isSharingAvailable = await Sharing.isAvailableAsync();
  if (!isSharingAvailable) {
    throw new Error('Функція "Поділитись" недоступна на цьому пристрої');
  }

  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) {
    throw new Error('Файлова система недоступна на цьому пристрої');
  }

  const fileUri = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'Зберегти резервну копію',
    UTI: 'public.json',
  });
}

export async function saveTextFile(content: string, filename: string, dialogTitle = 'Зберегти файл'): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }
    return;
  }

  const isSharingAvailable = await Sharing.isAvailableAsync();
  if (!isSharingAvailable) {
    throw new Error('Функція "Поділитись" недоступна на цьому пристрої');
  }

  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) {
    throw new Error('Файлова система недоступна на цьому пристрої');
  }

  const fileUri = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });

  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/plain',
    dialogTitle,
    UTI: 'public.plain-text',
  });
}

export async function pickAndImportBackup(): Promise<ImportResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
  });

  if (result.canceled) {
    return { imported: 0, errors: [], canceled: true };
  }

  // Web — читаємо з File об'єкта напряму
  if (Platform.OS === 'web') {
    const webFile = (result.assets?.[0] as any)?.file;
    if (webFile) {
      const text = await webFile.text();
      return await importBackup(text);
    }
    return { imported: 0, errors: ['Не вдалося прочитати файл резервної копії'] };
  }

  // Native (iOS / Android)
  const uri = result.assets?.[0]?.uri;

  if (!uri) {
    return { imported: 0, errors: ['Не вдалося прочитати файл резервної копії'] };
  }

  const json = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });

  return await importBackup(json);
}
