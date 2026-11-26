import type Database from 'better-sqlite3';

function hasMigration(db: Database.Database, version: number): boolean {
  const row = db
    .prepare('SELECT version FROM schema_migrations WHERE version = ?')
    .get(version) as { version: number } | undefined;
  return Boolean(row);
}

function recordMigration(db: Database.Database, version: number): void {
  db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
    version,
    new Date().toISOString()
  );
}

export function runMigrations(db: Database.Database): void {
  // Migration 2 (Phase 4a): courses + timetable_events
  if (!hasMigration(db, 2)) {
    const migrateV2 = db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS courses (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT NOT NULL DEFAULT '',
          color TEXT NOT NULL DEFAULT '#3A6BB5',
          instructor TEXT NOT NULL DEFAULT '',
          room TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS timetable_events (
          id TEXT PRIMARY KEY,
          course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
          title TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'class' CHECK (type IN ('class', 'exam', 'deadline', 'personal')),
          day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
          start TEXT NOT NULL,
          end TEXT NOT NULL,
          location TEXT NOT NULL DEFAULT '',
          repeat TEXT NOT NULL DEFAULT 'weekly' CHECK (repeat IN ('weekly', 'none')),
          date TEXT,
          notes TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_timetable_events_course ON timetable_events(course_id);
        CREATE INDEX IF NOT EXISTS idx_timetable_events_dow ON timetable_events(day_of_week, date);
      `);
      recordMigration(db, 2);
    });
    migrateV2();
  }

  // Migration 3 (Phase 4b): tasks + subtasks + study_sessions.task_id
  if (!hasMigration(db, 3)) {
    const migrateV3 = db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          notes TEXT NOT NULL DEFAULT '',
          due_date TEXT,
          priority TEXT NOT NULL DEFAULT 'med' CHECK (priority IN ('low', 'med', 'high')),
          course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
          status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
          repeat TEXT NOT NULL DEFAULT 'none' CHECK (repeat IN ('none', 'daily', 'weekly')),
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          completed_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_tasks_due_status ON tasks(due_date, status, sort_order);
        CREATE INDEX IF NOT EXISTS idx_tasks_course ON tasks(course_id);

        CREATE TABLE IF NOT EXISTS subtasks (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
          sort_order INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id, sort_order);

        INSERT OR IGNORE INTO tasks (
          id, title, notes, due_date, priority, course_id, status, repeat, sort_order, created_at, completed_at
        )
        SELECT
          id,
          title,
          '',
          due_date,
          'med',
          NULL,
          CASE WHEN completed = 1 THEN 'done' ELSE 'todo' END,
          'none',
          position,
          created_at,
          CASE WHEN completed = 1 THEN updated_at ELSE NULL END
        FROM todos;
      `);

      const cols = db.prepare('PRAGMA table_info(study_sessions)').all() as Array<{ name: string }>;
      if (!cols.some((c) => c.name === 'task_id')) {
        db.exec(
          'ALTER TABLE study_sessions ADD COLUMN task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL'
        );
      }

      recordMigration(db, 3);
    });
    migrateV3();
  }

  // Migration 4 (Phase 4c): notebooks, upgraded notes, tags, note_tags, notes_fts (FTS5)
  if (!hasMigration(db, 4)) {
    const migrateV4 = db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS notebooks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS note_tags (
          note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
          tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
          PRIMARY KEY (note_id, tag_id)
        );

        CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id);
      `);

      const cols = db.prepare('PRAGMA table_info(notes)').all() as Array<{ name: string }>;
      const colSet = new Set(cols.map((c) => c.name));

      if (!colSet.has('body')) {
        db.exec("ALTER TABLE notes ADD COLUMN body TEXT NOT NULL DEFAULT ''");
        db.exec("UPDATE notes SET body = content WHERE body = '' AND content != ''");
      }
      if (!colSet.has('notebook_id')) {
        db.exec('ALTER TABLE notes ADD COLUMN notebook_id TEXT REFERENCES notebooks(id) ON DELETE SET NULL');
      }
      if (!colSet.has('course_id')) {
        db.exec('ALTER TABLE notes ADD COLUMN course_id TEXT REFERENCES courses(id) ON DELETE SET NULL');
      }
      if (!colSet.has('pinned')) {
        db.exec('ALTER TABLE notes ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0');
      }
      if (!colSet.has('created_at')) {
        db.exec("ALTER TABLE notes ADD COLUMN created_at TEXT NOT NULL DEFAULT ''");
        db.exec("UPDATE notes SET created_at = updated_at WHERE created_at = ''");
      }

      db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
          note_id UNINDEXED,
          title,
          body
        );

        DELETE FROM notes_fts;
        INSERT INTO notes_fts (note_id, title, body)
        SELECT id, title, body FROM notes;

        CREATE TRIGGER IF NOT EXISTS notes_fts_ai AFTER INSERT ON notes BEGIN
          INSERT INTO notes_fts (note_id, title, body) VALUES (new.id, new.title, new.body);
        END;

        CREATE TRIGGER IF NOT EXISTS notes_fts_ad AFTER DELETE ON notes BEGIN
          DELETE FROM notes_fts WHERE note_id = old.id;
        END;

        CREATE TRIGGER IF NOT EXISTS notes_fts_au AFTER UPDATE OF title, body ON notes BEGIN
          DELETE FROM notes_fts WHERE note_id = old.id;
          INSERT INTO notes_fts (note_id, title, body) VALUES (new.id, new.title, new.body);
        END;
      `);

      recordMigration(db, 4);
    });
    migrateV4();
  }
}
