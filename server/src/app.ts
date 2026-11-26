import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import type Database from 'better-sqlite3';
import { createHealthRouter } from './routes/health.js';
import { createVocabRouter } from './routes/vocab.js';
import { createToolsRouter } from './routes/tools.js';
import { createPlannerRouter } from './routes/planner.js';
import { createTasksRouter } from './routes/tasks.js';
import { createNotesRouter } from './routes/notes.js';

export interface AppOptions {
  clientOrigin?: string;
}

export function createApp(db: Database.Database, options: AppOptions = {}): express.Express {
  const app = express();
  const allowedOrigin = options.clientOrigin ?? process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

  app.use(
    cors({
      origin: allowedOrigin,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/health', createHealthRouter(db));
  app.use('/api', createVocabRouter(db));
  app.use('/api', createToolsRouter(db));
  app.use('/api', createPlannerRouter(db));
  app.use('/api', createTasksRouter(db));
  app.use('/api', createNotesRouter(db));

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  });

  return app;
}
