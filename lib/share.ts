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

  // Android — використовуємо Storage Access Framework (SAF)
  // щоб зберегти файл напряму в папку обрану користувачем
  if (Platform.OS === 'android') {
    const permissions =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

    if (!permissions.granted) {
      throw new Error('Немає дозволу на доступ до сховища');
    }

    const fileUri =
      await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        filename,
        'application/json',
      );

    await FileSystem.writeAsStringAsync(fileUri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return;
  }

  // iOS — стандартний sharing
  const isSharingAvailable = await Sharing.isAvailableAsync();
  if (!isSharingAvailable) {
    throw new Error('Функція "Поділитись" недоступна на цьому пристрої');
  }

  const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!cacheDir) {
    throw new Error('Файлова система недоступна на цьому пристрої');
  }

  const fileUri = cacheDir.endsWith('/')
    ? `${cacheDir}${filename}`
    : `${cacheDir}/${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

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

  // Web — читаємо з File об'єкта напряму
  if (Platform.OS === 'web') {
    const file = (result.assets?.[0] as any)?.file;
    if (file) {
      const text = await file.text();
      return await importBackup(text);
    }
    return { imported: 0, errors: ['Не вдалося прочитати файл резервної копії'] };
  }

  // Native (iOS / Android)
  const uri = result.assets?.[0]?.uri;

  if (!uri) {
    return { imported: 0, errors: ['Не вдалося прочитати файл резервної копії'] };
  }

  const json = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return await importBackup(json);
}