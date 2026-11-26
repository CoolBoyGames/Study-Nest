import crypto from 'node:crypto';
import { Router } from 'express';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import {
  getNextRecurringDueDate,
  getTodayIsoDate,
  type PlannerTask,
  type Subtask,
  type TaskPriority,
  type TaskRepeat,
  type TaskStatus,
  type TaskUpdateResponse,
} from '@studyspace/shared';
import { validateBody } from '../middleware/validate.js';

interface TaskRow {
  id: string;
  title: string;
  notes: string;
  due_date: string | null;
  priority: TaskPriority;
  course_id: string | null;
  status: TaskStatus;
  repeat: TaskRepeat;
  sort_order: number;
  created_at: string;
  completed_at: string | null;
}

interface SubtaskRow {
  id: string;
  task_id: string;
  title: string;
  done: number;
  sort_order: number;
}

function mapSubtask(row: SubtaskRow): Subtask {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    done: row.done === 1,
    sortOrder: row.sort_order,
  };
}

function mapTask(row: TaskRow, subtasks: Subtask[]): PlannerTask {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    dueDate: row.due_date,
    priority: row.priority,
    courseId: row.course_id,
    status: row.status,
    repeat: row.repeat,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    subtasks,
  };
}

function getTaskWithSubtasks(db: Database.Database, taskId: string): PlannerTask | null {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as TaskRow | undefined;
  if (!row) return null;
  const subRows = db
    .prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC, id ASC')
    .all(taskId) as SubtaskRow[];
  return mapTask(row, subRows.map(mapSubtask));
}

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(240),
  notes: z.string().trim().max(2000).optional().default(''),
  dueDate: z.string().regex(isoDateRegex).nullable().optional().default(null),
  priority: z.enum(['low', 'med', 'high']).optional().default('med'),
  courseId: z.string().nullable().optional().default(null),
  status: z.enum(['todo', 'doing', 'done']).optional().default('todo'),
  repeat: z.enum(['none', 'daily', 'weekly']).optional().default('none'),
  subtasks: z.array(z.string().trim().min(1).max(200)).max(30).optional().default([]),
});

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(240).optional(),
  notes: z.string().trim().max(2000).optional(),
  dueDate: z.string().regex(isoDateRegex).nullable().optional(),
  priority: z.enum(['low', 'med', 'high']).optional(),
  courseId: z.string().nullable().optional(),
  status: z.enum(['todo', 'doing', 'done']).optional(),
  repeat: z.enum(['none', 'daily', 'weekly']).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const reorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1).max(500),
});

const createSubtaskSchema = z.object({
  title: z.string().trim().min(1, 'Subtask title is required').max(200),
});

const updateSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  done: z.boolean().optional(),
});

export function createTasksRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/tasks', (_req, res) => {
    const taskRows = db
      .prepare('SELECT * FROM tasks ORDER BY sort_order ASC, created_at ASC')
      .all() as TaskRow[];
    const subRows = db
      .prepare('SELECT * FROM subtasks ORDER BY sort_order ASC, id ASC')
      .all() as SubtaskRow[];

    const byTask = new Map<string, Subtask[]>();
    for (const sr of subRows) {
      const list = byTask.get(sr.task_id) ?? [];
      list.push(mapSubtask(sr));
      byTask.set(sr.task_id, list);
    }

    res.json(taskRows.map((r) => mapTask(r, byTask.get(r.id) ?? [])));
  });

  router.post('/tasks', validateBody(createTaskSchema), (req, res) => {
    const body = req.body as z.infer<typeof createTaskSchema>;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    if (body.courseId) {
      const c = db.prepare('SELECT id FROM courses WHERE id = ?').get(body.courseId);
      if (!c) {
        res.status(400).json({ error: 'Referenced course does not exist' });
        return;
      }
    }

    const maxOrder = db
      .prepare('SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM tasks')
      .get() as { max_order: number };
    const sortOrder = maxOrder.max_order + 1;
    const completedAt = body.status === 'done' ? now : null;

    const createTx = db.transaction(() => {
      db.prepare(
        `INSERT INTO tasks (
          id, title, notes, due_date, priority, course_id, status, repeat, sort_order, created_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        body.title,
        body.notes,
        body.dueDate,
        body.priority,
        body.courseId,
        body.status,
        body.repeat,
        sortOrder,
        now,
        completedAt
      );

      body.subtasks.forEach((subTitle, idx) => {
        db.prepare(
          'INSERT INTO subtasks (id, task_id, title, done, sort_order) VALUES (?, ?, ?, 0, ?)'
        ).run(crypto.randomUUID(), id, subTitle, idx);
      });
    });

    createTx();
    const created = getTaskWithSubtasks(db, id);
    res.status(201).json(created);
  });

  router.post('/tasks/reorder', validateBody(reorderSchema), (req, res) => {
    const { orderedIds } = req.body as z.infer<typeof reorderSchema>;
    const update = db.prepare('UPDATE tasks SET sort_order = ? WHERE id = ?');
    const run = db.transaction(() => {
      orderedIds.forEach((id, idx) => {
        update.run(idx, id);
      });
    });
    run();
    res.status(204).end();
  });

  router.patch('/tasks/:id', validateBody(updateTaskSchema), (req, res) => {
    const existing = db
      .prepare('SELECT * FROM tasks WHERE id = ?')
      .get(req.params.id) as TaskRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const body = req.body as z.infer<typeof updateTaskSchema>;
    const now = new Date().toISOString();
    const nextStatus = body.status ?? existing.status;
    const becameDone = existing.status !== 'done' && nextStatus === 'done';
    const nextCompletedAt =
      nextStatus === 'done' ? (existing.completed_at ?? now) : null;

    const nextRow: TaskRow = {
      ...existing,
      title: body.title ?? existing.title,
      notes: body.notes ?? existing.notes,
      due_date: body.dueDate !== undefined ? body.dueDate : existing.due_date,
      priority: body.priority ?? existing.priority,
      course_id: body.courseId !== undefined ? body.courseId : existing.course_id,
      status: nextStatus,
      repeat: body.repeat ?? existing.repeat,
      sort_order: body.sortOrder ?? existing.sort_order,
      completed_at: nextCompletedAt,
    };

    let nextTaskId: string | null = null;

    const updateTx = db.transaction(() => {
      db.prepare(
        `UPDATE tasks
         SET title = ?, notes = ?, due_date = ?, priority = ?, course_id = ?, status = ?, repeat = ?, sort_order = ?, completed_at = ?
         WHERE id = ?`
      ).run(
        nextRow.title,
        nextRow.notes,
        nextRow.due_date,
        nextRow.priority,
        nextRow.course_id,
        nextRow.status,
        nextRow.repeat,
        nextRow.sort_order,
        nextRow.completed_at,
        existing.id
      );

      if (becameDone && nextRow.repeat !== 'none') {
        const nextDue = getNextRecurringDueDate(nextRow.due_date, nextRow.repeat, getTodayIsoDate());
        const newId = crypto.randomUUID();
        nextTaskId = newId;
        const maxOrder = db
          .prepare('SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM tasks')
          .get() as { max_order: number };

        db.prepare(
          `INSERT INTO tasks (
            id, title, notes, due_date, priority, course_id, status, repeat, sort_order, created_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'todo', ?, ?, ?, NULL)`
        ).run(
          newId,
          nextRow.title,
          nextRow.notes,
          nextDue,
          nextRow.priority,
          nextRow.course_id,
          nextRow.repeat,
          maxOrder.max_order + 1,
          now
        );

        // Clone subtasks reset to undone
        const existingSubs = db
          .prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC')
          .all(existing.id) as SubtaskRow[];
        for (const sub of existingSubs) {
          db.prepare(
            'INSERT INTO subtasks (id, task_id, title, done, sort_order) VALUES (?, ?, ?, 0, ?)'
          ).run(crypto.randomUUID(), newId, sub.title, sub.sort_order);
        }
      }
    });

    updateTx();

    const payload: TaskUpdateResponse = {
      task: getTaskWithSubtasks(db, existing.id)!,
      nextTask: nextTaskId ? getTaskWithSubtasks(db, nextTaskId) : null,
    };
    res.json(payload);
  });

  router.delete('/tasks/:id', (req, res) => {
    const info = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.status(204).end();
  });

  // Subtasks
  router.post('/tasks/:id/subtasks', validateBody(createSubtaskSchema), (req, res) => {
    const taskId = String(req.params.id);
    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const body = req.body as z.infer<typeof createSubtaskSchema>;
    const maxOrder = db
      .prepare('SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM subtasks WHERE task_id = ?')
      .get(taskId) as { max_order: number };
    const id = crypto.randomUUID();
    const sortOrder = maxOrder.max_order + 1;

    db.prepare(
      'INSERT INTO subtasks (id, task_id, title, done, sort_order) VALUES (?, ?, ?, 0, ?)'
    ).run(id, taskId, body.title, sortOrder);

    const created: Subtask = { id, taskId, title: body.title, done: false, sortOrder };
    res.status(201).json(created);
  });

  router.patch('/subtasks/:id', validateBody(updateSubtaskSchema), (req, res) => {
    const existing = db
      .prepare('SELECT * FROM subtasks WHERE id = ?')
      .get(req.params.id) as SubtaskRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Subtask not found' });
      return;
    }

    const body = req.body as z.infer<typeof updateSubtaskSchema>;
    const nextTitle = body.title ?? existing.title;
    const nextDone = body.done !== undefined ? (body.done ? 1 : 0) : existing.done;

    db.prepare('UPDATE subtasks SET title = ?, done = ? WHERE id = ?').run(
      nextTitle,
      nextDone,
      existing.id
    );

    res.json(mapSubtask({ ...existing, title: nextTitle, done: nextDone }));
  });

  router.delete('/subtasks/:id', (req, res) => {
    const info = db.prepare('DELETE FROM subtasks WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Subtask not found' });
      return;
    }
    res.status(204).end();
  });

  return router;
}
