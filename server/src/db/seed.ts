import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import {
  addDaysIso,
  getTodayIsoDate,
  SAMPLE_COURSES,
  SAMPLE_DECK_CARDS,
  SAMPLE_DECK_DESCRIPTION,
  SAMPLE_DECK_NAME,
  SAMPLE_NOTES,
  SAMPLE_TASKS,
  SAMPLE_WEEKLY_EVENTS,
} from '@studyspace/shared';

function seedVocabIfEmpty(db: Database.Database): void {
  const row = db.prepare('SELECT COUNT(*) as count FROM decks').get() as { count: number };
  if (row.count > 0) return;

  const now = new Date().toISOString();
  const today = getTodayIsoDate();
  const deckId = crypto.randomUUID();

  const insertDeck = db.prepare(
    'INSERT INTO decks (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  );
  const insertCard = db.prepare(`
    INSERT INTO cards (
      id, deck_id, word, meaning, part_of_speech, example, notes, tags,
      repetitions, interval_days, ease_factor, due_date, last_reviewed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 2.5, ?, NULL, ?, ?)
  `);

  const runSeed = db.transaction(() => {
    insertDeck.run(deckId, SAMPLE_DECK_NAME, SAMPLE_DECK_DESCRIPTION, now, now);
    for (const item of SAMPLE_DECK_CARDS) {
      insertCard.run(
        crypto.randomUUID(),
        deckId,
        item.word,
        item.meaning,
        item.partOfSpeech,
        item.example,
        item.notes,
        JSON.stringify(item.tags),
        today,
        now,
        now
      );
    }
  });

  runSeed();
}

function seedPlannerIfEmpty(db: Database.Database): void {
  const row = db.prepare('SELECT COUNT(*) as count FROM courses').get() as { count: number };
  if (row.count > 0) return;

  const now = new Date().toISOString();
  const courseIdsByKey = new Map<string, string>();

  const insertCourse = db.prepare(
    `INSERT INTO courses (id, name, code, color, instructor, room, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertEvent = db.prepare(
    `INSERT INTO timetable_events (
      id, course_id, title, type, day_of_week, start, end, location, repeat, date, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'weekly', NULL, ?, ?, ?)`
  );

  const runSeed = db.transaction(() => {
    for (const c of SAMPLE_COURSES) {
      const id = crypto.randomUUID();
      courseIdsByKey.set(c.key, id);
      insertCourse.run(id, c.name, c.code, c.color, c.instructor, c.room, now, now);
    }

    for (const ev of SAMPLE_WEEKLY_EVENTS) {
      const courseId = courseIdsByKey.get(ev.courseKey) ?? null;
      insertEvent.run(
        crypto.randomUUID(),
        courseId,
        ev.title,
        ev.type,
        ev.dayOfWeek,
        ev.start,
        ev.end,
        ev.location,
        ev.notes,
        now,
        now
      );
    }
  });

  runSeed();
}

function seedTasksIfEmpty(db: Database.Database): void {
  const row = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };
  if (row.count > 0) return;

  const now = new Date().toISOString();
  const today = getTodayIsoDate();

  const courseRows = db.prepare('SELECT id, code FROM courses').all() as Array<{
    id: string;
    code: string;
  }>;
  const codeToId = new Map<string, string>();
  for (const r of courseRows) {
    const prefix = r.code.split(' ')[0]?.toLowerCase() ?? '';
    if (prefix) codeToId.set(prefix, r.id);
  }

  const insertTask = db.prepare(
    `INSERT INTO tasks (
      id, title, notes, due_date, priority, course_id, status, repeat, sort_order, created_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertSub = db.prepare(
    'INSERT INTO subtasks (id, task_id, title, done, sort_order) VALUES (?, ?, ?, 0, ?)'
  );

  const runSeed = db.transaction(() => {
    SAMPLE_TASKS.forEach((item, idx) => {
      const id = crypto.randomUUID();
      const dueDate =
        item.dueOffsetDays === null ? null : addDaysIso(today, item.dueOffsetDays);
      const courseId = item.courseKey ? (codeToId.get(item.courseKey) ?? null) : null;
      const completedAt = item.status === 'done' ? now : null;

      insertTask.run(
        id,
        item.title,
        item.notes,
        dueDate,
        item.priority,
        courseId,
        item.status,
        item.repeat,
        idx,
        now,
        completedAt
      );

      item.subtasks.forEach((subTitle, sIdx) => {
        insertSub.run(crypto.randomUUID(), id, subTitle, sIdx);
      });
    });
  });

  runSeed();
}

function seedNotesIfEmpty(db: Database.Database): void {
  const row = db.prepare('SELECT COUNT(*) as count FROM notes').get() as { count: number };
  if (row.count > 0) return;

  const now = new Date().toISOString();
  const courseRows = db.prepare('SELECT id, code FROM courses').all() as Array<{
    id: string;
    code: string;
  }>;
  const codeToId = new Map<string, string>();
  for (const r of courseRows) {
    const prefix = r.code.split(' ')[0]?.toLowerCase() ?? '';
    if (prefix) codeToId.set(prefix, r.id);
  }

  const notebookIds = new Map<string, string>();
  const insertNotebook = db.prepare(
    'INSERT INTO notebooks (id, name, created_at) VALUES (?, ?, ?)'
  );
  const insertNote = db.prepare(
    `INSERT INTO notes (
      id, title, content, body, notebook_id, course_id, pinned, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)');
  const selectTag = db.prepare('SELECT id FROM tags WHERE name = ?');
  const insertNoteTag = db.prepare(
    'INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)'
  );

  const runSeed = db.transaction(() => {
    for (const item of SAMPLE_NOTES) {
      let nbId = notebookIds.get(item.notebookName);
      if (!nbId) {
        nbId = crypto.randomUUID();
        notebookIds.set(item.notebookName, nbId);
        insertNotebook.run(nbId, item.notebookName, now);
      }

      const noteId = crypto.randomUUID();
      const courseId = item.courseKey ? (codeToId.get(item.courseKey) ?? null) : null;
      insertNote.run(
        noteId,
        item.title,
        item.body,
        item.body,
        nbId,
        courseId,
        item.pinned ? 1 : 0,
        now,
        now
      );

      for (const rawTag of item.tags) {
        const tagName = rawTag.trim().toLowerCase();
        if (!tagName) continue;
        insertTag.run(crypto.randomUUID(), tagName);
        const t = selectTag.get(tagName) as { id: string };
        insertNoteTag.run(noteId, t.id);
      }
    }
  });

  runSeed();
}

export function seedDatabaseIfEmpty(db: Database.Database): void {
  seedVocabIfEmpty(db);
  seedPlannerIfEmpty(db);
  seedTasksIfEmpty(db);
  seedNotesIfEmpty(db);
}
