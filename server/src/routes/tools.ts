import crypto from 'node:crypto';
import { Router } from 'express';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import {
  addDaysIso,
  getTodayIsoDate,
  type AnalyticsSummary,
  type DailyFocusPoint,
  type DailyGoal,
  type ScratchpadNote,
  type StudySession,
  type TodoItem,
  type TodosDayResponse,
} from '@studyspace/shared';
import { validateBody } from '../middleware/validate.js';

interface TodoRow {
  id: string;
  title: string;
  completed: number;
  due_date: string;
  position: number;
  created_at: string;
  updated_at: string;
}

interface GoalRow {
  date: string;
  target_minutes: number;
  target_tasks: number;
  updated_at: string;
}

interface NoteRow {
  id: string;
  title: string;
  content: string;
  updated_at: string;
}

interface SessionRow {
  id: string;
  date: string;
  duration_minutes: number;
  source: 'pomodoro' | 'manual';
  completed_at: string;
}

function mapTodo(row: TodoRow): TodoItem {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed === 1,
    dueDate: row.due_date,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapGoal(row: GoalRow): DailyGoal {
  return {
    date: row.date,
    targetMinutes: row.target_minutes,
    targetTasks: row.target_tasks,
    updatedAt: row.updated_at,
  };
}

function mapNote(row: NoteRow): ScratchpadNote {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    updatedAt: row.updated_at,
  };
}

function mapSession(row: SessionRow): StudySession {
  return {
    id: row.id,
    date: row.date,
    durationMinutes: row.duration_minutes,
    source: row.source,
    completedAt: row.completed_at,
  };
}

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createTodoSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(240),
  dueDate: z.string().regex(isoDateRegex).optional(),
});

const updateTodoSchema = z.object({
  title: z.string().trim().min(1).max(240).optional(),
  completed: z.boolean().optional(),
  dueDate: z.string().regex(isoDateRegex).optional(),
  position: z.number().int().min(0).optional(),
});

const updateGoalSchema = z.object({
  targetMinutes: z.number().int().min(5).max(720),
  targetTasks: z.number().int().min(1).max(50),
});

const createNoteSchema = z.object({
  title: z.string().trim().min(1).max(120).optional().default('Untitled note'),
  content: z.string().max(100_000).optional().default(''),
});

const updateNoteSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  content: z.string().max(100_000).optional(),
});

const createSessionSchema = z.object({
  durationMinutes: z.number().int().min(1).max(480),
  source: z.enum(['pomodoro', 'manual']).optional().default('pomodoro'),
  date: z.string().regex(isoDateRegex).optional(),
});

export function createToolsRouter(db: Database.Database): Router {
  const router = Router();

  // Todos + Daily Goal
  router.get('/todos', (req, res) => {
    const rawDate = typeof req.query.date === 'string' ? req.query.date : '';
    const date = isoDateRegex.test(rawDate) ? rawDate : getTodayIsoDate();

    const rows = db
      .prepare('SELECT * FROM todos WHERE due_date = ? ORDER BY position ASC, created_at ASC')
      .all(date) as TodoRow[];

    const goalRow = db
      .prepare('SELECT * FROM daily_goals WHERE date = ?')
      .get(date) as GoalRow | undefined;

    const goal: DailyGoal = goalRow
      ? mapGoal(goalRow)
      : {
          date,
          targetMinutes: 120,
          targetTasks: 5,
          updatedAt: new Date().toISOString(),
        };

    const payload: TodosDayResponse = {
      date,
      todos: rows.map(mapTodo),
      goal,
    };
    res.json(payload);
  });

  router.post('/todos', validateBody(createTodoSchema), (req, res) => {
    const body = req.body as z.infer<typeof createTodoSchema>;
    const date = body.dueDate ?? getTodayIsoDate();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const maxPos = db
      .prepare('SELECT COALESCE(MAX(position), -1) AS max_pos FROM todos WHERE due_date = ?')
      .get(date) as { max_pos: number };
    const position = maxPos.max_pos + 1;

    db.prepare(
      `INSERT INTO todos (id, title, completed, due_date, position, created_at, updated_at)
       VALUES (?, ?, 0, ?, ?, ?, ?)`
    ).run(id, body.title, date, position, now, now);

    const created: TodoItem = {
      id,
      title: body.title,
      completed: false,
      dueDate: date,
      position,
      createdAt: now,
      updatedAt: now,
    };
    res.status(201).json(created);
  });

  router.patch('/todos/:id', validateBody(updateTodoSchema), (req, res) => {
    const existing = db
      .prepare('SELECT * FROM todos WHERE id = ?')
      .get(req.params.id) as TodoRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const body = req.body as z.infer<typeof updateTodoSchema>;
    const now = new Date().toISOString();
    const next: TodoRow = {
      ...existing,
      title: body.title ?? existing.title,
      completed: body.completed !== undefined ? (body.completed ? 1 : 0) : existing.completed,
      due_date: body.dueDate ?? existing.due_date,
      position: body.position ?? existing.position,
      updated_at: now,
    };

    db.prepare(
      'UPDATE todos SET title = ?, completed = ?, due_date = ?, position = ?, updated_at = ? WHERE id = ?'
    ).run(next.title, next.completed, next.due_date, next.position, next.updated_at, existing.id);

    res.json(mapTodo(next));
  });

  router.delete('/todos/:id', (req, res) => {
    const info = db.prepare('DELETE FROM todos WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.status(204).end();
  });

  router.put('/goals/:date', validateBody(updateGoalSchema), (req, res) => {
    const date = String(req.params.date);
    if (!isoDateRegex.test(date)) {
      res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD)' });
      return;
    }

    const body = req.body as z.infer<typeof updateGoalSchema>;
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO daily_goals (date, target_minutes, target_tasks, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         target_minutes = excluded.target_minutes,
         target_tasks = excluded.target_tasks,
         updated_at = excluded.updated_at`
    ).run(date, body.targetMinutes, body.targetTasks, now);

    const updated: DailyGoal = {
      date,
      targetMinutes: body.targetMinutes,
      targetTasks: body.targetTasks,
      updatedAt: now,
    };
    res.json(updated);
  });

  // Scratchpad Notes
  router.get('/notes', (_req, res) => {
    let rows = db.prepare('SELECT * FROM notes ORDER BY updated_at DESC').all() as NoteRow[];

    if (rows.length === 0) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const starter =
        '# Study Scratchpad\n\nJot down lecture thoughts, equations, or questions here.\n\n- [ ] Review key concepts\n';
      db.prepare('INSERT INTO notes (id, title, content, updated_at) VALUES (?, ?, ?, ?)').run(
        id,
        'Scratchpad',
        starter,
        now
      );
      rows = [{ id, title: 'Scratchpad', content: starter, updated_at: now }];
    }

    res.json(rows.map(mapNote));
  });

  router.post('/notes', validateBody(createNoteSchema), (req, res) => {
    const body = req.body as z.infer<typeof createNoteSchema>;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare('INSERT INTO notes (id, title, content, updated_at) VALUES (?, ?, ?, ?)').run(
      id,
      body.title,
      body.content,
      now
    );

    const created: ScratchpadNote = {
      id,
      title: body.title,
      content: body.content,
      updatedAt: now,
    };
    res.status(201).json(created);
  });

  router.put('/notes/:id', validateBody(updateNoteSchema), (req, res) => {
    const existing = db
      .prepare('SELECT * FROM notes WHERE id = ?')
      .get(req.params.id) as NoteRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    const body = req.body as z.infer<typeof updateNoteSchema>;
    const now = new Date().toISOString();
    const nextTitle = body.title ?? existing.title;
    const nextContent = body.content ?? existing.content;

    db.prepare('UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?').run(
      nextTitle,
      nextContent,
      now,
      existing.id
    );

    res.json(
      mapNote({
        id: existing.id,
        title: nextTitle,
        content: nextContent,
        updated_at: now,
      })
    );
  });

  router.delete('/notes/:id', (req, res) => {
    const info = db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(204).end();
  });

  // Study Analytics
  router.post('/analytics/sessions', validateBody(createSessionSchema), (req, res) => {
    const body = req.body as z.infer<typeof createSessionSchema>;
    const id = crypto.randomUUID();
    const date = body.date ?? getTodayIsoDate();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO study_sessions (id, date, duration_minutes, source, completed_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, date, body.durationMinutes, body.source, now);

    const row: SessionRow = {
      id,
      date,
      duration_minutes: body.durationMinutes,
      source: body.source,
      completed_at: now,
    };
    res.status(201).json(mapSession(row));
  });

  router.get('/analytics/summary', (req, res) => {
    const rawDays = Number(req.query.days ?? 84);
    const numDays = Number.isFinite(rawDays) ? Math.min(180, Math.max(7, Math.round(rawDays))) : 84;
    const today = getTodayIsoDate();

    const rows = db
      .prepare('SELECT date, SUM(duration_minutes) AS minutes, COUNT(*) AS sessions FROM study_sessions GROUP BY date ORDER BY date ASC')
      .all() as Array<{ date: string; minutes: number; sessions: number }>;

    const byDate = new Map<string, { minutes: number; sessions: number }>();
    let totalMinutes = 0;
    let totalSessions = 0;

    for (const r of rows) {
      byDate.set(r.date, { minutes: r.minutes, sessions: r.sessions });
      totalMinutes += r.minutes;
      totalSessions += r.sessions;
    }

    const days: DailyFocusPoint[] = [];
    for (let i = numDays - 1; i >= 0; i--) {
      const d = addDaysIso(today, -i);
      const entry = byDate.get(d);
      days.push({
        date: d,
        minutes: entry?.minutes ?? 0,
        sessions: entry?.sessions ?? 0,
      });
    }

    // Current streak (today or yesterday active)
    let currentStreak = 0;
    let cursor = byDate.has(today) ? today : addDaysIso(today, -1);
    while ((byDate.get(cursor)?.minutes ?? 0) > 0) {
      currentStreak++;
      cursor = addDaysIso(cursor, -1);
    }

    // Longest streak across all recorded dates
    const sortedActiveDates = Array.from(byDate.entries())
      .filter(([, v]) => v.minutes > 0)
      .map(([d]) => d)
      .sort();

    let longestStreak = 0;
    let run = 0;
    let prevDate: string | null = null;
    for (const d of sortedActiveDates) {
      if (prevDate && addDaysIso(prevDate, 1) === d) {
        run++;
      } else {
        run = 1;
      }
      if (run > longestStreak) longestStreak = run;
      prevDate = d;
    }

    const goalRow = db
      .prepare('SELECT target_minutes FROM daily_goals WHERE date = ?')
      .get(today) as { target_minutes: number } | undefined;

    const summary: AnalyticsSummary = {
      todayMinutes: byDate.get(today)?.minutes ?? 0,
      totalMinutes,
      totalSessions,
      currentStreak,
      longestStreak,
      dailyGoalMinutes: goalRow?.target_minutes ?? 120,
      days,
    };
    res.json(summary);
  });

  return router;
}
