import crypto from 'node:crypto';
import { Router } from 'express';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import {
  getDayOfWeekFromIso,
  parseIcs,
  serializeIcs,
  timeToMinutes,
  type Course,
  type TimetableEvent,
  type TimetableEventType,
  type TimetableRepeat,
} from '@studyspace/shared';
import { validateBody } from '../middleware/validate.js';

interface CourseRow {
  id: string;
  name: string;
  code: string;
  color: string;
  instructor: string;
  room: string;
  created_at: string;
  updated_at: string;
}

interface EventRow {
  id: string;
  course_id: string | null;
  title: string;
  type: TimetableEventType;
  day_of_week: number;
  start: string;
  end: string;
  location: string;
  repeat: TimetableRepeat;
  date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

function mapCourse(row: CourseRow): Course {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    color: row.color,
    instructor: row.instructor,
    room: row.room,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEvent(row: EventRow): TimetableEvent {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    type: row.type,
    dayOfWeek: row.day_of_week,
    start: row.start,
    end: row.end,
    location: row.location,
    repeat: row.repeat,
    date: row.date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

const createCourseSchema = z.object({
  name: z.string().trim().min(1, 'Course name is required').max(120),
  code: z.string().trim().max(30).optional().default(''),
  color: z.string().regex(hexColorRegex, 'Color must be a 6-digit hex code').optional().default('#3A6BB5'),
  instructor: z.string().trim().max(120).optional().default(''),
  room: z.string().trim().max(120).optional().default(''),
});

const updateCourseSchema = createCourseSchema.partial();

const createEventBaseSchema = z.object({
  courseId: z.string().nullable().optional().default(null),
  title: z.string().trim().min(1, 'Title is required').max(160),
  type: z.enum(['class', 'exam', 'deadline', 'personal']).optional().default('class'),
  dayOfWeek: z.number().int().min(0).max(6).optional().default(1),
  start: z.string().regex(timeRegex, 'Start time must be HH:MM'),
  end: z.string().regex(timeRegex, 'End time must be HH:MM'),
  location: z.string().trim().max(160).optional().default(''),
  repeat: z.enum(['weekly', 'none']).optional().default('weekly'),
  date: z.string().regex(isoDateRegex).nullable().optional().default(null),
  notes: z.string().trim().max(1000).optional().default(''),
});

const createEventSchema = createEventBaseSchema.refine(
  (d) => timeToMinutes(d.end) > timeToMinutes(d.start),
  { message: 'End time must be after start time', path: ['end'] }
);

const updateEventSchema = createEventBaseSchema.partial();

const importIcsSchema = z.object({
  ics: z.string().min(1, 'ICS content is required').max(1_000_000),
  courseId: z.string().nullable().optional().default(null),
});

export function createPlannerRouter(db: Database.Database): Router {
  const router = Router();

  // Courses
  router.get('/courses', (_req, res) => {
    const rows = db
      .prepare('SELECT * FROM courses ORDER BY code ASC, name ASC')
      .all() as CourseRow[];
    res.json(rows.map(mapCourse));
  });

  router.post('/courses', validateBody(createCourseSchema), (req, res) => {
    const body = req.body as z.infer<typeof createCourseSchema>;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO courses (id, name, code, color, instructor, room, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, body.name, body.code, body.color, body.instructor, body.room, now, now);

    const created: Course = {
      id,
      name: body.name,
      code: body.code,
      color: body.color,
      instructor: body.instructor,
      room: body.room,
      createdAt: now,
      updatedAt: now,
    };
    res.status(201).json(created);
  });

  router.patch('/courses/:id', validateBody(updateCourseSchema), (req, res) => {
    const existing = db
      .prepare('SELECT * FROM courses WHERE id = ?')
      .get(req.params.id) as CourseRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    const body = req.body as z.infer<typeof updateCourseSchema>;
    const now = new Date().toISOString();
    const next: CourseRow = {
      ...existing,
      name: body.name ?? existing.name,
      code: body.code ?? existing.code,
      color: body.color ?? existing.color,
      instructor: body.instructor ?? existing.instructor,
      room: body.room ?? existing.room,
      updated_at: now,
    };

    db.prepare(
      'UPDATE courses SET name = ?, code = ?, color = ?, instructor = ?, room = ?, updated_at = ? WHERE id = ?'
    ).run(next.name, next.code, next.color, next.instructor, next.room, next.updated_at, existing.id);

    res.json(mapCourse(next));
  });

  router.delete('/courses/:id', (req, res) => {
    const info = db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    res.status(204).end();
  });

  // Timetable Events
  router.get('/events', (_req, res) => {
    const rows = db
      .prepare('SELECT * FROM timetable_events ORDER BY day_of_week ASC, start ASC')
      .all() as EventRow[];
    res.json(rows.map(mapEvent));
  });

  router.post('/events', validateBody(createEventSchema), (req, res) => {
    const body = req.body as z.infer<typeof createEventSchema>;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const date = body.repeat === 'none' ? body.date : null;
    const dayOfWeek = date ? getDayOfWeekFromIso(date) : body.dayOfWeek;

    if (body.repeat === 'none' && !date) {
      res.status(400).json({ error: 'One-off event requires a date (YYYY-MM-DD)' });
      return;
    }

    if (body.courseId) {
      const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(body.courseId);
      if (!course) {
        res.status(400).json({ error: 'Referenced course does not exist' });
        return;
      }
    }

    db.prepare(
      `INSERT INTO timetable_events (
        id, course_id, title, type, day_of_week, start, end, location, repeat, date, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      body.courseId,
      body.title,
      body.type,
      dayOfWeek,
      body.start,
      body.end,
      body.location,
      body.repeat,
      date,
      body.notes,
      now,
      now
    );

    const created: TimetableEvent = {
      id,
      courseId: body.courseId,
      title: body.title,
      type: body.type,
      dayOfWeek,
      start: body.start,
      end: body.end,
      location: body.location,
      repeat: body.repeat,
      date,
      notes: body.notes,
      createdAt: now,
      updatedAt: now,
    };
    res.status(201).json(created);
  });

  router.patch('/events/:id', validateBody(updateEventSchema), (req, res) => {
    const existing = db
      .prepare('SELECT * FROM timetable_events WHERE id = ?')
      .get(req.params.id) as EventRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const body = req.body as z.infer<typeof updateEventSchema>;
    const nextRepeat = body.repeat ?? existing.repeat;
    const nextDate = nextRepeat === 'none' ? (body.date !== undefined ? body.date : existing.date) : null;
    const nextStart = body.start ?? existing.start;
    const nextEnd = body.end ?? existing.end;
    const nextDow = nextDate
      ? getDayOfWeekFromIso(nextDate)
      : (body.dayOfWeek ?? existing.day_of_week);

    if (timeToMinutes(nextEnd) <= timeToMinutes(nextStart)) {
      res.status(400).json({ error: 'End time must be after start time' });
      return;
    }
    if (nextRepeat === 'none' && !nextDate) {
      res.status(400).json({ error: 'One-off event requires a date' });
      return;
    }

    const now = new Date().toISOString();
    const next: EventRow = {
      ...existing,
      course_id: body.courseId !== undefined ? body.courseId : existing.course_id,
      title: body.title ?? existing.title,
      type: body.type ?? existing.type,
      day_of_week: nextDow,
      start: nextStart,
      end: nextEnd,
      location: body.location ?? existing.location,
      repeat: nextRepeat,
      date: nextDate,
      notes: body.notes ?? existing.notes,
      updated_at: now,
    };

    db.prepare(
      `UPDATE timetable_events
       SET course_id = ?, title = ?, type = ?, day_of_week = ?, start = ?, end = ?, location = ?, repeat = ?, date = ?, notes = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      next.course_id,
      next.title,
      next.type,
      next.day_of_week,
      next.start,
      next.end,
      next.location,
      next.repeat,
      next.date,
      next.notes,
      next.updated_at,
      existing.id
    );

    res.json(mapEvent(next));
  });

  router.delete('/events/:id', (req, res) => {
    const info = db.prepare('DELETE FROM timetable_events WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.status(204).end();
  });

  router.post('/events/import-ics', validateBody(importIcsSchema), (req, res) => {
    const body = req.body as z.infer<typeof importIcsSchema>;
    const parsed = parseIcs(body.ics);
    const now = new Date().toISOString();

    const insert = db.prepare(
      `INSERT INTO timetable_events (
        id, course_id, title, type, day_of_week, start, end, location, repeat, date, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const created: TimetableEvent[] = [];
    const run = db.transaction(() => {
      for (const item of parsed) {
        const id = crypto.randomUUID();
        insert.run(
          id,
          body.courseId,
          item.title,
          item.type,
          item.dayOfWeek,
          item.start,
          item.end,
          item.location,
          item.repeat,
          item.date,
          item.notes,
          now,
          now
        );
        created.push({
          id,
          courseId: body.courseId,
          title: item.title,
          type: item.type,
          dayOfWeek: item.dayOfWeek,
          start: item.start,
          end: item.end,
          location: item.location,
          repeat: item.repeat,
          date: item.date,
          notes: item.notes,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    run();
    res.status(201).json({ imported: created.length, events: created });
  });

  router.get('/events/export.ics', (req, res) => {
    const startDate =
      typeof req.query.startDate === 'string' && isoDateRegex.test(req.query.startDate)
        ? req.query.startDate
        : '2026-09-01';
    const endDate =
      typeof req.query.endDate === 'string' && isoDateRegex.test(req.query.endDate)
        ? req.query.endDate
        : '2026-12-20';

    const courseRows = db.prepare('SELECT * FROM courses').all() as CourseRow[];
    const eventRows = db.prepare('SELECT * FROM timetable_events').all() as EventRow[];

    const ics = serializeIcs(
      eventRows.map(mapEvent),
      courseRows.map(mapCourse),
      { startDate, endDate }
    );

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="studynest-timetable.ics"');
    res.send(ics);
  });

  return router;
}
