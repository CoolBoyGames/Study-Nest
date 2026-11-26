import type Database from 'better-sqlite3';

export const SCHEMA_VERSION = 1;

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      word TEXT NOT NULL,
      meaning TEXT NOT NULL,
      part_of_speech TEXT NOT NULL DEFAULT '',
      example TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      repetitions INTEGER NOT NULL DEFAULT 0,
      interval_days INTEGER NOT NULL DEFAULT 0,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      due_date TEXT NOT NULL,
      last_reviewed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cards_deck_due ON cards(deck_id, due_date);

    CREATE TABLE IF NOT EXISTS review_logs (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating IN (1, 2, 3, 4)),
      reviewed_at TEXT NOT NULL,
      interval_after INTEGER NOT NULL,
      ease_after REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_review_logs_reviewed_at ON review_logs(reviewed_at);

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
      due_date TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_todos_due ON todos(due_date, position);

    CREATE TABLE IF NOT EXISTS daily_goals (
      date TEXT PRIMARY KEY,
      target_minutes INTEGER NOT NULL DEFAULT 120,
      target_tasks INTEGER NOT NULL DEFAULT 5,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Scratchpad',
      content TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
      source TEXT NOT NULL DEFAULT 'pomodoro' CHECK (source IN ('pomodoro', 'manual')),
      completed_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_study_sessions_date ON study_sessions(date);
  `);

  const existing = db
    .prepare('SELECT version FROM schema_migrations WHERE version = ?')
    .get(SCHEMA_VERSION) as { version: number } | undefined;

  if (!existing) {
    db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
      SCHEMA_VERSION,
      new Date().toISOString()
    );
  }
}
