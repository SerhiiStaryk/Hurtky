import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
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
  const cacheDirectory = (FileSystem as any).cacheDirectory as string;
  const fileUri = `${cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, json);

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'Зберегти резервну копію',
  });
}

export async function pickAndImportBackup(): Promise<ImportResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
  });

  if (result.canceled) {
    return { imported: 0, errors: [], canceled: true };
  }

  const uri = result.assets?.[0]?.uri;

  if (!uri) {
    return { imported: 0, errors: ['Не вдалося прочитати файл резервної копії'] };
  }

  const json = await FileSystem.readAsStringAsync(uri);

  return await importBackup(json);
}
