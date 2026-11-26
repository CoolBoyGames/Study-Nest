import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import type { Notebook, NoteTag, PlannerNote } from '@studyspace/shared';
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

describe('Phase 4c notes FTS5 API & v4 migration', () => {
  it('migrates legacy v1 notes into v4 schema with FTS5 index intact', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      INSERT INTO schema_migrations VALUES (1, '2026-11-01T00:00:00Z');
      CREATE TABLE decks (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE cards (id TEXT PRIMARY KEY, deck_id TEXT NOT NULL, word TEXT NOT NULL, meaning TEXT NOT NULL, part_of_speech TEXT NOT NULL DEFAULT '', example TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '[]', repetitions INTEGER NOT NULL DEFAULT 0, interval_days INTEGER NOT NULL DEFAULT 0, ease_factor REAL NOT NULL DEFAULT 2.5, due_date TEXT NOT NULL, last_reviewed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE review_logs (id TEXT PRIMARY KEY, card_id TEXT NOT NULL, deck_id TEXT NOT NULL, rating INTEGER NOT NULL, reviewed_at TEXT NOT NULL, interval_after INTEGER NOT NULL, ease_after REAL NOT NULL);
      CREATE TABLE todos (id TEXT PRIMARY KEY, title TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0, due_date TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE daily_goals (date TEXT PRIMARY KEY, target_minutes INTEGER NOT NULL DEFAULT 120, target_tasks INTEGER NOT NULL DEFAULT 5, updated_at TEXT NOT NULL);
      CREATE TABLE notes (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL);
      INSERT INTO notes VALUES ('n-legacy', 'Quantum Notes', 'Schrodinger wave equation', '2026-11-25T00:00:00Z');
      CREATE TABLE study_sessions (id TEXT PRIMARY KEY, date TEXT NOT NULL, duration_minutes INTEGER NOT NULL, source TEXT NOT NULL, completed_at TEXT NOT NULL);
    `);

    initSchema(db);

    const hits = db
      .prepare('SELECT note_id FROM notes_fts WHERE notes_fts MATCH ?')
      .all('Schrodinger') as Array<{ note_id: string }>;
    expect(hits.map((h) => h.note_id)).toEqual(['n-legacy']);
    db.close();
  });

  it('seeds 3 sample notes and supports FTS5 search, notebooks, tags, and pinning', async () => {
    await withServer(true, async (baseUrl) => {
      const notes = (await (await fetch(`${baseUrl}/api/notes`)).json()) as PlannerNote[];
      expect(notes).toHaveLength(3);
      expect(notes[0]?.pinned).toBe(true);

      const notebooks = (await (await fetch(`${baseUrl}/api/notebooks`)).json()) as Notebook[];
      expect(notebooks.length).toBeGreaterThanOrEqual(2);

      const tags = (await (await fetch(`${baseUrl}/api/tags`)).json()) as NoteTag[];
      expect(tags.some((t) => t.name === 'algorithms')).toBe(true);

      const ftsRes = (await (await fetch(`${baseUrl}/api/notes?q=Bellman`)).json()) as PlannerNote[];
      expect(ftsRes).toHaveLength(1);
      expect(ftsRes[0]?.title).toContain('Dijkstra');

      const tagRes = (await (await fetch(`${baseUrl}/api/notes?tag=linear-algebra`)).json()) as PlannerNote[];
      expect(tagRes).toHaveLength(1);
    });
  });

  it('creates, updates, pins, and deletes notes while keeping FTS5 synced', async () => {
    await withServer(false, async (baseUrl) => {
      const nb = (await (
        await fetch(`${baseUrl}/api/notebooks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Physics' }),
        })
      ).json()) as Notebook;

      const created = (await (
        await fetch(`${baseUrl}/api/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Thermodynamics',
            body: 'Entropy always increases in isolated systems.',
            notebookId: nb.id,
            tags: ['thermo', 'physics'],
          }),
        })
      ).json()) as PlannerNote;

      await fetch(`${baseUrl}/api/notes/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: 'Carnot efficiency depends on reservoir temperatures.', pinned: true }),
      });

      const found = (await (await fetch(`${baseUrl}/api/notes?q=Carnot`)).json()) as PlannerNote[];
      expect(found).toHaveLength(1);
      expect(found[0]?.pinned).toBe(true);

      await fetch(`${baseUrl}/api/notes/${created.id}`, { method: 'DELETE' });
      const afterDel = (await (await fetch(`${baseUrl}/api/notes?q=Carnot`)).json()) as PlannerNote[];
      expect(afterDel).toHaveLength(0);
    });
  });
});
