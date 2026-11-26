import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { initSchema } from './schema.js';
import { seedDatabaseIfEmpty } from './seed.js';

export interface DatabaseOptions {
  seed?: boolean;
}

export function createDatabase(dbPath: string, options: DatabaseOptions = {}): Database.Database {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }
  db.pragma('foreign_keys = ON');
  initSchema(db);
  if (options.seed !== false) {
    seedDatabaseIfEmpty(db);
  }
  return db;
}
