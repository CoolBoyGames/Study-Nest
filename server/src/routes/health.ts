import { Router } from 'express';
import type Database from 'better-sqlite3';
import type { ApiHealthResponse } from '@studyspace/shared';

export function createHealthRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    db.prepare('SELECT 1').get();
    const payload: ApiHealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    };
    res.json(payload);
  });

  return router;
}
