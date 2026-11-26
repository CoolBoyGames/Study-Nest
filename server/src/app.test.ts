import { describe, expect, it } from 'vitest';
import { createDatabase } from './db/connection.js';
import { createApp } from './app.js';

describe('server database and health route', () => {
  it('initializes all expected SQLite tables', () => {
    const db = createDatabase(':memory:');
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;

    const tableNames = rows.map((r) => r.name);
    expect(tableNames).toEqual(
      expect.arrayContaining([
        'schema_migrations',
        'decks',
        'cards',
        'review_logs',
        'todos',
        'daily_goals',
        'notes',
        'study_sessions',
      ])
    );
    db.close();
  });

  it('responds ok on GET /api/health', async () => {
    const db = createDatabase(':memory:');
    const app = createApp(db);

    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });

    try {
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Expected numeric server port');
      }
      const res = await fetch(`http://127.0.0.1:${address.port}/api/health`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string; database: string };
      expect(body.status).toBe('ok');
      expect(body.database).toBe('connected');
    } finally {
      server.close();
      db.close();
    }
  });
});
