import { z } from 'zod';
import { getChildren, getClubsByChildId, insertChild, insertClub } from './repositories';
import { runInTransaction } from './db';

export interface BackupScheduleSlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface BackupClub {
  name: string;
  teacher_name?: string | null;
  location?: string | null;
  color_hex?: string;
  emoji?: string;
  price?: number;
  next_payment_date?: string | null;
  payment_iban?: string | null;
  payment_card?: string | null;
  schedules: BackupScheduleSlot[];
}

export interface BackupChild {
  name: string;
  birth_date: string;
  photo_uri?: string | null;
  notes?: string | null;
  clubs: BackupClub[];
}

export interface BackupData {
  version: 1;
  exported_at: string;
  children: BackupChild[];
}

const BackupSchema = z.object({
  version: z.literal(1),
  exported_at: z.string(),
  children: z.array(
    z.object({
      name: z.string(),
      birth_date: z.string(),
      photo_uri: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      clubs: z.array(
        z.object({
          name: z.string(),
          teacher_name: z.string().nullable().optional(),
          location: z.string().nullable().optional(),
          color_hex: z.string().optional(),
          emoji: z.string().optional(),
          price: z.number().optional(),
          next_payment_date: z.string().nullable().optional(),
          payment_iban: z.string().nullable().optional(),
          payment_card: z.string().nullable().optional(),
          schedules: z.array(
            z.object({
              day_of_week: z.number().min(1).max(7),
              start_time: z.string(),
              end_time: z.string(),
            }),
          ),
        }),
      ),
    }),
  ),
});

export async function exportBackup(): Promise<string> {
  const children = await getChildren();

  const exportedChildren = await Promise.all(
    children.map(async child => {
      const clubs = await getClubsByChildId(child.id);

      return {
        name: child.name,
        birth_date: child.birth_date,
        photo_uri: child.photo_uri ?? null,
        notes: child.notes ?? null,
        clubs: clubs.map(club => ({
          name: club.name,
          teacher_name: club.teacher_name ?? null,
          location: club.location ?? null,
          color_hex: club.color_hex,
          emoji: club.emoji,
          price: club.price,
          next_payment_date: club.next_payment_date ?? null,
          payment_iban: club.payment_iban ?? null,
          payment_card: club.payment_card ?? null,
          schedules: club.schedules.map(schedule => ({
            day_of_week: schedule.day_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
          })),
        })),
      };
    }),
  );

  const backup: BackupData = {
    version: 1,
    exported_at: new Date().toISOString(),
    children: exportedChildren,
  };

  return JSON.stringify(backup, null, 2);
}

export async function importBackup(json: string): Promise<{ imported: number; errors: string[] }> {
  try {
    const parsed = JSON.parse(json);
    const backup = BackupSchema.parse(parsed);

    let importedCount = 0;

    await runInTransaction(async db => {
      for (const child of backup.children) {
        const childId = await insertChild({
          name: child.name,
          birth_date: child.birth_date,
          photo_uri: child.photo_uri ?? undefined,
          notes: child.notes ?? undefined,
        });

        for (const club of child.clubs) {
          const clubId = await insertClub({
            child_id: childId,
            name: club.name,
            teacher_name: club.teacher_name ?? undefined,
            location: club.location ?? undefined,
            color_hex: club.color_hex ?? '#4F46E5',
            emoji: club.emoji ?? '🎭',
            price: club.price ?? 0,
            next_payment_date: club.next_payment_date ?? undefined,
            payment_iban: club.payment_iban ?? undefined,
            payment_card: club.payment_card ?? undefined,
          });

          for (const schedule of club.schedules) {
            await db.runAsync(
              'INSERT INTO schedules (club_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
              [clubId, schedule.day_of_week, schedule.start_time, schedule.end_time],
            );
          }
        }

        importedCount += 1;
      }
    });

    return { imported: importedCount, errors: [] };
  } catch (error) {
    return {
      imported: 0,
      errors: [
        error instanceof Error
          ? error.message
          : 'Невідома помилка при імпорті резервної копії',
      ],
    };
  }
}
