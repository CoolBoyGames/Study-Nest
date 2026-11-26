import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import type { Course, TimetableEvent } from '@studyspace/shared';
import { createDatabase } from './db/connection.js';
import { initSchema } from './db/schema.js';
import { createApp } from './app.js';

async function withServer(seed: boolean, fn: (baseUrl: string) => Promise<void>): Promise<void> {
  const db = createDatabase(':memory:', { seed });
  const app = createApp(db);
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  try {
    const addr = server.address();
    if (!addr || typeof addr === 'string') throw new Error('Invalid port');
    await fn(`http://127.0.0.1:${addr.port}`);
  } finally {
    server.close();
    db.close();
  }
}

describe('Phase 4a planner API & v2 migration', () => {
  it('migrates an existing v1 database without losing v1 data', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      INSERT INTO schema_migrations VALUES (1, '2026-11-01T00:00:00Z');
      CREATE TABLE decks (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      INSERT INTO decks VALUES ('d1', 'Legacy Deck', '', '2026-11-01', '2026-11-01');
      CREATE TABLE cards (id TEXT PRIMARY KEY, deck_id TEXT NOT NULL, word TEXT NOT NULL, meaning TEXT NOT NULL, part_of_speech TEXT NOT NULL DEFAULT '', example TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '[]', repetitions INTEGER NOT NULL DEFAULT 0, interval_days INTEGER NOT NULL DEFAULT 0, ease_factor REAL NOT NULL DEFAULT 2.5, due_date TEXT NOT NULL, last_reviewed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE review_logs (id TEXT PRIMARY KEY, card_id TEXT NOT NULL, deck_id TEXT NOT NULL, rating INTEGER NOT NULL, reviewed_at TEXT NOT NULL, interval_after INTEGER NOT NULL, ease_after REAL NOT NULL);
      CREATE TABLE todos (id TEXT PRIMARY KEY, title TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0, due_date TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE daily_goals (date TEXT PRIMARY KEY, target_minutes INTEGER NOT NULL DEFAULT 120, target_tasks INTEGER NOT NULL DEFAULT 5, updated_at TEXT NOT NULL);
      CREATE TABLE notes (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL);
      CREATE TABLE study_sessions (id TEXT PRIMARY KEY, date TEXT NOT NULL, duration_minutes INTEGER NOT NULL, source TEXT NOT NULL, completed_at TEXT NOT NULL);
    `);

    initSchema(db);

    const deck = db.prepare('SELECT name FROM decks WHERE id = ?').get('d1') as { name: string };
    expect(deck.name).toBe('Legacy Deck');
    const mig = db.prepare('SELECT version FROM schema_migrations WHERE version = 2').get() as {
      version: number;
    };
    expect(mig.version).toBe(2);
    db.close();
  });

  it('seeds 4 courses and 10 weekly events on first run', async () => {
    await withServer(true, async (baseUrl) => {
      const courses = (await (await fetch(`${baseUrl}/api/courses`)).json()) as Course[];
      const events = (await (await fetch(`${baseUrl}/api/events`)).json()) as TimetableEvent[];
      expect(courses).toHaveLength(4);
      expect(events).toHaveLength(10);
    });
  });

  it('supports course & event CRUD, zod validation, and ICS import/export', async () => {
    await withServer(false, async (baseUrl) => {
      const cRes = await fetch(`${baseUrl}/api/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Operating Systems',
          code: 'CS 310',
          color: '#3A6BB5',
          instructor: 'Dr. Ada',
          room: 'Lab 3',
        }),
      });
      expect(cRes.status).toBe(201);
      const course = (await cRes.json()) as Course;

      const badEv = await fetch(`${baseUrl}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          title: 'Invalid Time',
          start: '12:00',
          end: '11:00',
        }),
      });
      expect(badEv.status).toBe(400);

      const evRes = await fetch(`${baseUrl}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          title: 'OS Seminar',
          type: 'class',
          dayOfWeek: 2,
          start: '10:00',
          end: '11:30',
          repeat: 'weekly',
        }),
      });
      expect(evRes.status).toBe(201);
      const ev = (await evRes.json()) as TimetableEvent;

      const icsOut = await (await fetch(`${baseUrl}/api/events/export.ics`)).text();
      expect(icsOut).toContain('CS 310: OS Seminar');

      const impRes = await fetch(`${baseUrl}/api/events/import-ics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ics: icsOut, courseId: course.id }),
      });
      expect(impRes.status).toBe(201);
      const impJson = (await impRes.json()) as { imported: number };
      expect(impJson.imported).toBe(1);

      const delRes = await fetch(`${baseUrl}/api/events/${ev.id}`, { method: 'DELETE' });
      expect(delRes.status).toBe(204);
    });
  });
});
