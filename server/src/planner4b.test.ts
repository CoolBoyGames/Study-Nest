import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { getTodayIsoDate, type PlannerTask, type TaskUpdateResponse } from '@studyspace/shared';
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

describe('Phase 4b tasks API & v3 migration', () => {
  it('migrates legacy v1 todos into v3 tasks without data loss', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      INSERT INTO schema_migrations VALUES (1, '2026-11-01T00:00:00Z');
      CREATE TABLE decks (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE cards (id TEXT PRIMARY KEY, deck_id TEXT NOT NULL, word TEXT NOT NULL, meaning TEXT NOT NULL, part_of_speech TEXT NOT NULL DEFAULT '', example TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '[]', repetitions INTEGER NOT NULL DEFAULT 0, interval_days INTEGER NOT NULL DEFAULT 0, ease_factor REAL NOT NULL DEFAULT 2.5, due_date TEXT NOT NULL, last_reviewed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE review_logs (id TEXT PRIMARY KEY, card_id TEXT NOT NULL, deck_id TEXT NOT NULL, rating INTEGER NOT NULL, reviewed_at TEXT NOT NULL, interval_after INTEGER NOT NULL, ease_after REAL NOT NULL);
      CREATE TABLE todos (id TEXT PRIMARY KEY, title TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0, due_date TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      INSERT INTO todos VALUES ('old-1', 'Legacy homework', 0, '2026-11-26', 0, '2026-11-25', '2026-11-25');
      CREATE TABLE daily_goals (date TEXT PRIMARY KEY, target_minutes INTEGER NOT NULL DEFAULT 120, target_tasks INTEGER NOT NULL DEFAULT 5, updated_at TEXT NOT NULL);
      CREATE TABLE notes (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL);
      CREATE TABLE study_sessions (id TEXT PRIMARY KEY, date TEXT NOT NULL, duration_minutes INTEGER NOT NULL, source TEXT NOT NULL, completed_at TEXT NOT NULL);
    `);

    initSchema(db);

    const task = db.prepare('SELECT title, status FROM tasks WHERE id = ?').get('old-1') as {
      title: string;
      status: string;
    };
    expect(task).toEqual({ title: 'Legacy homework', status: 'todo' });
    db.close();
  });

  it('seeds 8 tasks on first run and supports recurring task regeneration on completion', async () => {
    await withServer(true, async (baseUrl) => {
      const tasks = (await (await fetch(`${baseUrl}/api/tasks`)).json()) as PlannerTask[];
      expect(tasks).toHaveLength(8);

      const today = getTodayIsoDate();
      const createRes = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Daily review',
          dueDate: today,
          priority: 'high',
          repeat: 'daily',
          subtasks: ['Flashcards'],
        }),
      });
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as PlannerTask;
      expect(created.subtasks).toHaveLength(1);

      const doneRes = await fetch(`${baseUrl}/api/tasks/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      });
      expect(doneRes.status).toBe(200);
      const result = (await doneRes.json()) as TaskUpdateResponse;
      expect(result.task.status).toBe('done');
      expect(result.nextTask).not.toBeNull();
      expect(result.nextTask?.status).toBe('todo');
      expect(result.nextTask?.dueDate).not.toBe(today);
      expect(result.nextTask?.subtasks).toHaveLength(1);
      expect(result.nextTask?.subtasks[0]?.done).toBe(false);

      // Log Pomodoro session linked to task
      const sessRes = await fetch(`${baseUrl}/api/analytics/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes: 25, source: 'pomodoro', taskId: created.id }),
      });
      expect(sessRes.status).toBe(201);

      const byTask = (await (await fetch(`${baseUrl}/api/analytics/by-task`)).json()) as Record<
        string,
        number
      >;
      expect(byTask[created.id]).toBe(25);
    });
  });
});
