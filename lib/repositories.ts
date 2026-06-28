import { getDatabase, runInTransaction } from './db';

// Type Definitions
export interface Child {
  id: number;
  name: string;
  birth_date: string; // ISO date string
  photo_uri?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Club {
  id: number;
  child_id: number;
  name: string;
  teacher_name?: string | null;
  location?: string | null;
  color_hex: string;
  emoji: string;
  price: number;
  next_payment_date?: string | null;
  payment_iban?: string | null;
  payment_card?: string | null;
  is_vacation?: number;
  vacation_end_date?: string | null;
  created_at: string;
}

export interface Schedule {
  id: number;
  club_id: number;
  day_of_week: number; // 1=Monday, 7=Sunday
  start_time: string; // "16:00"
  end_time: string; // "17:30"
}

export interface ChildWithClubs extends Child {
  clubs: ClubWithSchedules[];
}

export interface ClubWithSchedules extends Club {
  schedules: Schedule[];
}

// Input types for create/update
export type CreateChildInput = Omit<Child, 'id' | 'created_at'>;
export type UpdateChildInput = Partial<Omit<Child, 'id' | 'created_at'>>;

export type CreateClubInput = Omit<Club, 'id' | 'created_at'>;
export type UpdateClubInput = Partial<Omit<Club, 'id' | 'created_at'>>;

export type ScheduleInput = Omit<Schedule, 'id' | 'club_id'>;

// Children Repository Functions
export async function getChildren(): Promise<Child[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Child>('SELECT * FROM children ORDER BY name ASC');
  return result || [];
}

export async function getChildById(id: number): Promise<ChildWithClubs | null> {
  const db = await getDatabase();
  const child = await db.getFirstAsync<Child>('SELECT * FROM children WHERE id = ?', [id]);

  if (!child) {
    return null;
  }

  const clubs = await getClubsByChildId(id);

  return {
    ...child,
    clubs,
  };
}

export async function insertChild(data: CreateChildInput): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO children (name, birth_date, photo_uri, notes)
     VALUES (?, ?, ?, ?)`,
    [data.name, data.birth_date, data.photo_uri || null, data.notes || null],
  );
  return result.lastInsertRowId;
}

export async function updateChild(id: number, data: UpdateChildInput): Promise<void> {
  const db = await getDatabase();

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.birth_date !== undefined) {
    updates.push('birth_date = ?');
    values.push(data.birth_date);
  }
  if (data.photo_uri !== undefined) {
    updates.push('photo_uri = ?');
    values.push(data.photo_uri || null);
  }
  if (data.notes !== undefined) {
    updates.push('notes = ?');
    values.push(data.notes || null);
  }

  if (updates.length === 0) {
    return;
  }

  values.push(id);

  await db.runAsync(`UPDATE children SET ${updates.join(', ')} WHERE id = ?`, values);
}

export async function deleteChild(id: number): Promise<void> {
  await runInTransaction(async db => {
    await db.runAsync('DELETE FROM schedules WHERE club_id IN (SELECT id FROM clubs WHERE child_id = ?)', [id]);
    await db.runAsync('DELETE FROM clubs WHERE child_id = ?', [id]);
    await db.runAsync('DELETE FROM children WHERE id = ?', [id]);
  });
}

// Clubs Repository Functions
export async function getClubsByChildId(childId: number): Promise<ClubWithSchedules[]> {
  const db = await getDatabase();
  const clubs = await db.getAllAsync<Club>('SELECT * FROM clubs WHERE child_id = ? ORDER BY name ASC', [childId]);

  if (!clubs || clubs.length === 0) {
    return [];
  }

  const clubsWithSchedules: ClubWithSchedules[] = [];
  for (const club of clubs) {
    const schedules = await db.getAllAsync<Schedule>(
      'SELECT * FROM schedules WHERE club_id = ? ORDER BY day_of_week ASC',
      [club.id],
    );
    clubsWithSchedules.push({
      ...club,
      schedules: schedules || [],
    });
  }

  return clubsWithSchedules;
}

export async function getClubsByChildIds(childIds: number[]): Promise<Map<number, Club[]>> {
  const db = await getDatabase();
  const uniqueIds = Array.from(new Set(childIds));

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const placeholders = uniqueIds.map(() => '?').join(', ');
  const clubs = await db.getAllAsync<Club>(
    `SELECT * FROM clubs WHERE child_id IN (${placeholders}) ORDER BY child_id ASC, name ASC`,
    uniqueIds,
  );

  const map = new Map<number, Club[]>();
  if (!clubs || clubs.length === 0) {
    return map;
  }

  for (const club of clubs) {
    const childClubs = map.get(club.child_id) ?? [];
    childClubs.push(club);
    map.set(club.child_id, childClubs);
  }

  return map;
}

export interface UpcomingScheduleRow {
  id: number;
  start_time: string;
  end_time: string;
  day_of_week: number;
  club_name: string;
  club_emoji: string;
  color_hex: string;
  child_name: string;
  is_vacation?: number;
  vacation_end_date?: string | null;
  club_id: number;
}

export async function getUpcomingLessonsForDays(days: number[]): Promise<UpcomingScheduleRow[]> {
  const db = await getDatabase();
  const uniqueDays = Array.from(new Set(days));

  if (uniqueDays.length === 0) {
    return [];
  }

  const placeholders = uniqueDays.map(() => '?').join(', ');
  const rows = await db.getAllAsync<UpcomingScheduleRow>(
    `SELECT
       s.id,
       s.start_time,
       s.end_time,
       s.day_of_week,
       c.name AS club_name,
       c.emoji AS club_emoji,
       c.color_hex,
       ch.name AS child_name,
       c.is_vacation,
       c.vacation_end_date,
       c.id AS club_id
     FROM schedules s
     JOIN clubs c ON c.id = s.club_id
     JOIN children ch ON ch.id = c.child_id
     WHERE s.day_of_week IN (${placeholders})
     ORDER BY s.day_of_week ASC, s.start_time ASC`,
    uniqueDays,
  );

  return rows || [];
}

export async function getClubById(id: number): Promise<ClubWithSchedules | null> {
  const db = await getDatabase();
  const club = await db.getFirstAsync<Club>('SELECT * FROM clubs WHERE id = ?', [id]);

  if (!club) {
    return null;
  }

  const schedules = await db.getAllAsync<Schedule>(
    'SELECT * FROM schedules WHERE club_id = ? ORDER BY day_of_week ASC',
    [id],
  );

  return {
    ...club,
    schedules: schedules || [],
  };
}

export async function insertClub(data: CreateClubInput): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO clubs (
      child_id, name, teacher_name, location, color_hex, emoji,
      price, next_payment_date, payment_iban, payment_card,
      is_vacation, vacation_end_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.child_id,
      data.name,
      data.teacher_name || null,
      data.location || null,
      data.color_hex || '#4F46E5',
      data.emoji || '🎭',
      data.price || 0,
      data.next_payment_date || null,
      data.payment_iban || null,
      data.payment_card || null,
      data.is_vacation || 0,
      data.vacation_end_date || null,
    ],
  );
  return result.lastInsertRowId;
}

export async function updateClub(id: number, data: UpdateClubInput): Promise<void> {
  const db = await getDatabase();

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.teacher_name !== undefined) {
    updates.push('teacher_name = ?');
    values.push(data.teacher_name || null);
  }
  if (data.location !== undefined) {
    updates.push('location = ?');
    values.push(data.location || null);
  }
  if (data.color_hex !== undefined) {
    updates.push('color_hex = ?');
    values.push(data.color_hex);
  }
  if (data.emoji !== undefined) {
    updates.push('emoji = ?');
    values.push(data.emoji);
  }
  if (data.price !== undefined) {
    updates.push('price = ?');
    values.push(data.price);
  }
  if (data.next_payment_date !== undefined) {
    updates.push('next_payment_date = ?');
    values.push(data.next_payment_date || null);
  }
  if (data.payment_iban !== undefined) {
    updates.push('payment_iban = ?');
    values.push(data.payment_iban || null);
  }
  if (data.payment_card !== undefined) {
    updates.push('payment_card = ?');
    values.push(data.payment_card || null);
  }
  if (data.is_vacation !== undefined) {
    updates.push('is_vacation = ?');
    values.push(data.is_vacation);
  }
  if (data.vacation_end_date !== undefined) {
    updates.push('vacation_end_date = ?');
    values.push(data.vacation_end_date || null);
  }

  if (updates.length === 0) {
    return;
  }

  values.push(id);

  await db.runAsync(`UPDATE clubs SET ${updates.join(', ')} WHERE id = ?`, values);
}

export async function deleteClub(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM clubs WHERE id = ?', [id]);
}

// Schedules Repository Functions
export async function upsertSchedules(clubId: number, slots: ScheduleInput[]): Promise<void> {
  await runInTransaction(async db => {
    // Delete existing schedules for this club
    await db.runAsync('DELETE FROM schedules WHERE club_id = ?', [clubId]);

    // Insert new schedules
    for (const slot of slots) {
      await db.runAsync(
        `INSERT INTO schedules (club_id, day_of_week, start_time, end_time)
         VALUES (?, ?, ?, ?)`,
        [clubId, slot.day_of_week, slot.start_time, slot.end_time],
      );
    }
  });
}

// Aggregate Functions
export async function getAllClubsWithSchedules(): Promise<ClubWithSchedules[]> {
  const db = await getDatabase();
  const clubs = await db.getAllAsync<Club>('SELECT * FROM clubs ORDER BY name ASC');

  if (!clubs || clubs.length === 0) {
    return [];
  }

  const clubsWithSchedules: ClubWithSchedules[] = [];
  for (const club of clubs) {
    const schedules = await db.getAllAsync<Schedule>(
      'SELECT * FROM schedules WHERE club_id = ? ORDER BY day_of_week ASC',
      [club.id],
    );
    clubsWithSchedules.push({
      ...club,
      schedules: schedules || [],
    });
  }

  return clubsWithSchedules;
}

// Payment Functions
export async function markClubAsPaid(id: number): Promise<void> {
  const db = await getDatabase();
  const club = await db.getFirstAsync<Club>('SELECT next_payment_date FROM clubs WHERE id = ?', [id]);

  if (!club) {
    throw new Error(`Club with id ${id} not found`);
  }

  // Calculate next payment date (1 month from now or from existing date)
  let baseDate = club.next_payment_date ? new Date(club.next_payment_date) : new Date();

  // If the date is invalid, fallback to current date
  if (isNaN(baseDate.getTime())) {
    baseDate = new Date();
  }

  const nextDate = new Date(baseDate);
  nextDate.setMonth(nextDate.getMonth() + 1);
  const nextPaymentDate = nextDate.toISOString().split('T')[0]; // YYYY-MM-DD

  await db.runAsync('UPDATE clubs SET next_payment_date = ? WHERE id = ?', [nextPaymentDate, id]);
}
