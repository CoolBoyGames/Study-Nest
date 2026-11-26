import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase } from './db/connection.js';
import { createApp } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 3001);
const defaultDbPath = path.resolve(__dirname, '../../data/studynest.db');
const dbPath = process.env.DATABASE_PATH ?? defaultDbPath;

const db = createDatabase(dbPath);
const app = createApp(db);

const server = app.listen(port, () => {
  process.stdout.write(`StudyNest server listening on http://localhost:${port}\n`);
});

function shutdown(): void {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
