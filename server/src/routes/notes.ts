import crypto from 'node:crypto';
import { Router } from 'express';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import type { Notebook, NoteTag, PlannerNote } from '@studyspace/shared';
import { validateBody } from '../middleware/validate.js';

interface NotebookRow {
  id: string;
  name: string;
  created_at: string;
}

interface NoteRow {
  id: string;
  title: string;
  content: string;
  body: string;
  notebook_id: string | null;
  course_id: string | null;
  pinned: number;
  created_at: string;
  updated_at: string;
}

function getTagsForNote(db: Database.Database, noteId: string): string[] {
  const rows = db
    .prepare(
      `SELECT t.name
       FROM tags t
       INNER JOIN note_tags nt ON nt.tag_id = t.id
       WHERE nt.note_id = ?
       ORDER BY t.name ASC`
    )
    .all(noteId) as Array<{ name: string }>;
  return rows.map((r) => r.name);
}

function mapNote(row: NoteRow, tags: string[]): PlannerNote {
  const body = row.body || row.content;
  return {
    id: row.id,
    title: row.title,
    body,
    content: body,
    notebookId: row.notebook_id,
    courseId: row.course_id,
    pinned: row.pinned === 1,
    tags,
    createdAt: row.created_at || row.updated_at,
    updatedAt: row.updated_at,
  };
}

function syncNoteTags(db: Database.Database, noteId: string, tags: string[]): void {
  db.prepare('DELETE FROM note_tags WHERE note_id = ?').run(noteId);
  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)');
  const findTag = db.prepare('SELECT id FROM tags WHERE name = ?');
  const link = db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)');

  const seen = new Set<string>();
  for (const raw of tags) {
    const clean = raw.trim().toLowerCase();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    insertTag.run(crypto.randomUUID(), clean);
    const row = findTag.get(clean) as { id: string };
    link.run(noteId, row.id);
  }
}

function buildFtsQuery(raw: string): string | null {
  const tokens = raw
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/["'*^(){}[\]:]/g, ''))
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `"${t}"*`).join(' AND ');
}

const createNotebookSchema = z.object({
  name: z.string().trim().min(1, 'Notebook name is required').max(80),
});

const createNoteSchema = z.object({
  title: z.string().trim().min(1).max(160).optional().default('Untitled note'),
  body: z.string().max(150_000).optional(),
  content: z.string().max(150_000).optional(),
  notebookId: z.string().nullable().optional().default(null),
  courseId: z.string().nullable().optional().default(null),
  pinned: z.boolean().optional().default(false),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional().default([]),
});

const updateNoteSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  body: z.string().max(150_000).optional(),
  content: z.string().max(150_000).optional(),
  notebookId: z.string().nullable().optional(),
  courseId: z.string().nullable().optional(),
  pinned: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export function createNotesRouter(db: Database.Database): Router {
  const router = Router();

  // Notebooks
  router.get('/notebooks', (_req, res) => {
    const rows = db
      .prepare('SELECT * FROM notebooks ORDER BY created_at ASC, name ASC')
      .all() as NotebookRow[];
    const result: Notebook[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.created_at,
    }));
    res.json(result);
  });

  router.post('/notebooks', validateBody(createNotebookSchema), (req, res) => {
    const body = req.body as z.infer<typeof createNotebookSchema>;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO notebooks (id, name, created_at) VALUES (?, ?, ?)').run(
      id,
      body.name,
      now
    );
    const created: Notebook = { id, name: body.name, createdAt: now };
    res.status(201).json(created);
  });

  router.delete('/notebooks/:id', (req, res) => {
    const info = db.prepare('DELETE FROM notebooks WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Notebook not found' });
      return;
    }
    res.status(204).end();
  });

  // Tags
  router.get('/tags', (_req, res) => {
    const rows = db
      .prepare(
        `SELECT DISTINCT t.id, t.name
         FROM tags t
         INNER JOIN note_tags nt ON nt.tag_id = t.id
         ORDER BY t.name ASC`
      )
      .all() as NoteTag[];
    res.json(rows);
  });

  // Notes (FTS5 search + notebook/tag/course filters)
  router.get('/notes', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const notebookId = typeof req.query.notebookId === 'string' ? req.query.notebookId : '';
    const courseId = typeof req.query.courseId === 'string' ? req.query.courseId : '';
    const tag = typeof req.query.tag === 'string' ? req.query.tag.trim().toLowerCase() : '';

    // Ensure at least one starter note exists if DB has 0 notes and no filter is applied
    if (!q && !notebookId && !courseId && !tag) {
      const countRow = db.prepare('SELECT COUNT(*) AS count FROM notes').get() as { count: number };
      if (countRow.count === 0) {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const starter =
          '# Study Scratchpad\n\nJot down lecture thoughts, equations, or questions here.\n\n- [ ] Review key concepts\n';
        db.prepare(
          `INSERT INTO notes (id, title, content, body, notebook_id, course_id, pinned, created_at, updated_at)
           VALUES (?, ?, ?, ?, NULL, NULL, 0, ?, ?)`
        ).run(id, 'Scratchpad', starter, starter, now, now);
      }
    }

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (q) {
      const ftsExpr = buildFtsQuery(q);
      if (ftsExpr) {
        conditions.push(
          'n.id IN (SELECT note_id FROM notes_fts WHERE notes_fts MATCH ?)'
        );
        params.push(ftsExpr);
      }
    }

    if (notebookId) {
      conditions.push('n.notebook_id = ?');
      params.push(notebookId);
    }

    if (courseId) {
      conditions.push('n.course_id = ?');
      params.push(courseId);
    }

    if (tag) {
      conditions.push(
        `n.id IN (
          SELECT nt.note_id FROM note_tags nt
          INNER JOIN tags t ON t.id = nt.tag_id
          WHERE t.name = ?
        )`
      );
      params.push(tag);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db
      .prepare(
        `SELECT n.* FROM notes n ${where} ORDER BY n.pinned DESC, n.updated_at DESC`
      )
      .all(...params) as NoteRow[];

    const result = rows.map((row) => mapNote(row, getTagsForNote(db, row.id)));
    res.json(result);
  });

  router.post('/notes', validateBody(createNoteSchema), (req, res) => {
    const body = req.body as z.infer<typeof createNoteSchema>;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const noteBody = body.body ?? body.content ?? '';

    const run = db.transaction(() => {
      db.prepare(
        `INSERT INTO notes (
          id, title, content, body, notebook_id, course_id, pinned, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        body.title,
        noteBody,
        noteBody,
        body.notebookId,
        body.courseId,
        body.pinned ? 1 : 0,
        now,
        now
      );
      syncNoteTags(db, id, body.tags);
    });
    run();

    const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as NoteRow;
    res.status(201).json(mapNote(row, getTagsForNote(db, id)));
  });

  const handleUpdate = (
    noteId: string,
    body: z.infer<typeof updateNoteSchema>
  ): PlannerNote | null => {
    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId) as
      | NoteRow
      | undefined;
    if (!existing) return null;

    const now = new Date().toISOString();
    const nextTitle = body.title ?? existing.title;
    const nextBody =
      body.body !== undefined
        ? body.body
        : body.content !== undefined
          ? body.content
          : existing.body || existing.content;
    const nextNotebookId =
      body.notebookId !== undefined ? body.notebookId : existing.notebook_id;
    const nextCourseId = body.courseId !== undefined ? body.courseId : existing.course_id;
    const nextPinned = body.pinned !== undefined ? (body.pinned ? 1 : 0) : existing.pinned;

    const run = db.transaction(() => {
      db.prepare(
        `UPDATE notes
         SET title = ?, content = ?, body = ?, notebook_id = ?, course_id = ?, pinned = ?, updated_at = ?
         WHERE id = ?`
      ).run(
        nextTitle,
        nextBody,
        nextBody,
        nextNotebookId,
        nextCourseId,
        nextPinned,
        now,
        existing.id
      );

      if (body.tags !== undefined) {
        syncNoteTags(db, existing.id, body.tags);
      }
    });
    run();

    const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(existing.id) as NoteRow;
    return mapNote(updated, getTagsForNote(db, existing.id));
  };

  router.put('/notes/:id', validateBody(updateNoteSchema), (req, res) => {
    const updated = handleUpdate(String(req.params.id), req.body as z.infer<typeof updateNoteSchema>);
    if (!updated) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.json(updated);
  });

  router.patch('/notes/:id', validateBody(updateNoteSchema), (req, res) => {
    const updated = handleUpdate(String(req.params.id), req.body as z.infer<typeof updateNoteSchema>);
    if (!updated) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.json(updated);
  });

  router.delete('/notes/:id', (req, res) => {
    const info = db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(204).end();
  });

  return router;
}
