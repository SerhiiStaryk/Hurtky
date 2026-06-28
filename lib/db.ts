import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'clubsmanager.db';
const DATABASE_VERSION = 1;

let db: SQLite.SQLiteDatabase | null = null;

export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON');

  // Run migrations
  await runMigrations(db);

  return db;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Check if tables exist by querying schema
    const tablesExist = await checkTablesExist(database);

    if (!tablesExist) {
      // Create all tables
      await createTables(database);
    } else {
      // Add columns if they do not exist
      try {
        await database.execAsync('ALTER TABLE clubs ADD COLUMN is_vacation INTEGER DEFAULT 0;');
      } catch (e) {
        // column may already exist
      }
      try {
        await database.execAsync('ALTER TABLE clubs ADD COLUMN vacation_end_date TEXT;');
      } catch (e) {
        // column may already exist
      }
    }
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}

async function checkTablesExist(database: SQLite.SQLiteDatabase): Promise<boolean> {
  try {
    const result = await database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='children'",
    );
    return (result?.count ?? 0) > 0;
  } catch (error) {
    return false;
  }
}

async function createTables(database: SQLite.SQLiteDatabase): Promise<void> {
  const migrations = [
    // Children table
    `CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      photo_uri TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );`,

    // Clubs table
    `CREATE TABLE IF NOT EXISTS clubs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      teacher_name TEXT,
      location TEXT,
      color_hex TEXT DEFAULT '#4F46E5',
      emoji TEXT DEFAULT '🎭',
      price INTEGER DEFAULT 0,
      next_payment_date TEXT,
      payment_iban TEXT,
      payment_card TEXT,
      is_vacation INTEGER DEFAULT 0,
      vacation_end_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );`,

    // Schedules table
    `CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL
    );`,

    // Create indexes for common queries
    'CREATE INDEX IF NOT EXISTS idx_clubs_child_id ON clubs(child_id);',
    'CREATE INDEX IF NOT EXISTS idx_schedules_club_id ON schedules(club_id);',
  ];

  for (const migration of migrations) {
    await database.execAsync(migration);
  }
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

// Helper function for running transactions
export async function runInTransaction<T>(callback: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  const database = await getDatabase();
  await database.execAsync('BEGIN TRANSACTION');
  try {
    const result = await callback(database);
    await database.execAsync('COMMIT');
    return result;
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
}
