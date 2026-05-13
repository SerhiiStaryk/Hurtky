import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { format } from 'date-fns';
import { exportBackup, importBackup } from './backup';

export interface ImportResult {
  imported: number;
  errors: string[];
  canceled?: boolean;
}

export async function saveAndShareBackup(): Promise<void> {
  const json = await exportBackup();
  const filename = `hurtky-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;

  const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

  // If native file system is not available OR we are on Web, use browser download
  if (Platform.OS === 'web' || !cacheDir) {
    if (typeof document !== 'undefined') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    
    // If we're here and cacheDir is still null, then it's a real failure
    if (!cacheDir) {
      throw new Error('Файлова система недоступна на цьому пристрої');
    }
  }

  const isSharingAvailable = await Sharing.isAvailableAsync();
  if (!isSharingAvailable) {
    throw new Error('Функція "Поділитись" недоступна на цьому пристрої');
  }

  const fileUri = cacheDir.endsWith('/') 
    ? `${cacheDir}${filename}` 
    : `${cacheDir}/${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, json);

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'Зберегти резервну копію',
    UTI: 'public.json',
  });
}

export async function pickAndImportBackup(): Promise<ImportResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
  });

  if (result.canceled) {
    return { imported: 0, errors: [], canceled: true };
  }

  // Web fallback: read directly from the File object
  if (Platform.OS === 'web') {
    const file = (result.assets?.[0] as any)?.file;
    if (file) {
      const text = await file.text();
      return await importBackup(text);
    }
  }

  const uri = result.assets?.[0]?.uri;

  if (!uri) {
    return { imported: 0, errors: ['Не вдалося прочитати файл резервної копії'] };
  }

  const json = await FileSystem.readAsStringAsync(uri);

  return await importBackup(json);
}
