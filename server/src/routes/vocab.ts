import crypto from 'node:crypto';
import { Router } from 'express';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import {
  addDaysIso,
  getTodayIsoDate,
  parseCardsCsv,
  previewSm2Intervals,
  scheduleSm2,
  serializeCardsCsv,
  type Deck,
  type DeckWithCounts,
  type ImportCardsResponse,
  type ReviewRating,
  type SrsStats,
  type VocabCard,
  type VocabCardWithPreviews,
} from '@studyspace/shared';
import { validateBody } from '../middleware/validate.js';

interface DeckRow {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface CardRow {
  id: string;
  deck_id: string;
  word: string;
  meaning: string;
  part_of_speech: string;
  example: string;
  notes: string;
  tags: string;
  repetitions: number;
  interval_days: number;
  ease_factor: number;
  due_date: string;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapDeck(row: DeckRow): Deck {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function mapCard(row: CardRow): VocabCard {
  return {
    id: row.id,
    deckId: row.deck_id,
    word: row.word,
    meaning: row.meaning,
    partOfSpeech: row.part_of_speech,
    example: row.example,
    notes: row.notes,
    tags: parseTags(row.tags),
    repetitions: row.repetitions,
    intervalDays: row.interval_days,
    easeFactor: row.ease_factor,
    dueDate: row.due_date,
    lastReviewedAt: row.last_reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function computeVocabStats(db: Database.Database, deckId?: string): SrsStats {
  const today = getTodayIsoDate();

  const cardCounts = (
    deckId
      ? db
          .prepare(
            `SELECT
               COUNT(*) AS total,
               SUM(CASE WHEN due_date <= ? THEN 1 ELSE 0 END) AS due_today,
               SUM(CASE WHEN repetitions = 0 THEN 1 ELSE 0 END) AS new_count,
               SUM(CASE WHEN repetitions >= 1 THEN 1 ELSE 0 END) AS learned_count
             FROM cards WHERE deck_id = ?`
          )
          .get(today, deckId)
      : db
          .prepare(
            `SELECT
               COUNT(*) AS total,
               SUM(CASE WHEN due_date <= ? THEN 1 ELSE 0 END) AS due_today,
               SUM(CASE WHEN repetitions = 0 THEN 1 ELSE 0 END) AS new_count,
               SUM(CASE WHEN repetitions >= 1 THEN 1 ELSE 0 END) AS learned_count
             FROM cards`
          )
          .get(today)
  ) as {
    total: number;
    due_today: number | null;
    new_count: number | null;
    learned_count: number | null;
  };

  const logs = (
    deckId
      ? db
          .prepare('SELECT rating, reviewed_at FROM review_logs WHERE deck_id = ?')
          .all(deckId)
      : db.prepare('SELECT rating, reviewed_at FROM review_logs').all()
  ) as Array<{ rating: number; reviewed_at: string }>;

  const totalReviews = logs.length;
  const passedReviews = logs.filter((l) => l.rating >= 2).length;
  const retentionRate =
    totalReviews === 0 ? 0 : Math.round((passedReviews / totalReviews) * 100);

  const daySet = new Set<string>();
  let reviewedToday = 0;
  for (const log of logs) {
    const day = getTodayIsoDate(new Date(log.reviewed_at));
    daySet.add(day);
    if (day === today) {
      reviewedToday++;
    }
  }

  let reviewStreak = 0;
  let cursor = daySet.has(today) ? today : addDaysIso(today, -1);
  while (daySet.has(cursor)) {
    reviewStreak++;
    cursor = addDaysIso(cursor, -1);
  }

  return {
    dueToday: cardCounts.due_today ?? 0,
    newCount: cardCounts.new_count ?? 0,
    learnedCount: cardCounts.learned_count ?? 0,
    totalCards: cardCounts.total,
    retentionRate,
    reviewStreak,
    reviewedToday,
  };
}

const createDeckSchema = z.object({
  name: z.string().trim().min(1, 'Deck name is required').max(120),
  description: z.string().trim().max(500).optional().default(''),
});

const updateDeckSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional(),
});

const createCardSchema = z.object({
  word: z.string().trim().min(1, 'Word is required').max(200),
  meaning: z.string().trim().min(1, 'Meaning is required').max(1000),
  partOfSpeech: z.string().trim().max(60).optional().default(''),
  example: z.string().trim().max(1000).optional().default(''),
  notes: z.string().trim().max(1000).optional().default(''),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional().default([]),
});

const updateCardSchema = createCardSchema.partial();

const reviewSchema = z.object({
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});

const importSchema = z.object({
  format: z.enum(['csv', 'json']),
  data: z.string().min(1, 'Import data is required').max(2_000_000),
});

export function createVocabRouter(db: Database.Database): Router {
  const router = Router();

  // Decks
  router.get('/decks', (_req, res) => {
    const today = getTodayIsoDate();
    const decks = db
      .prepare('SELECT * FROM decks ORDER BY created_at ASC')
      .all() as DeckRow[];

    const countsStmt = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN due_date <= ? THEN 1 ELSE 0 END) AS due_count,
        SUM(CASE WHEN repetitions = 0 THEN 1 ELSE 0 END) AS new_count,
        SUM(CASE WHEN repetitions >= 1 THEN 1 ELSE 0 END) AS learned_count
      FROM cards
      WHERE deck_id = ?
    `);

    const result: DeckWithCounts[] = decks.map((d) => {
      const c = countsStmt.get(today, d.id) as {
        total: number;
        due_count: number | null;
        new_count: number | null;
        learned_count: number | null;
      };
      return {
        ...mapDeck(d),
        totalCards: c.total,
        dueCount: c.due_count ?? 0,
        newCount: c.new_count ?? 0,
        learnedCount: c.learned_count ?? 0,
      };
    });

    res.json(result);
  });

  router.post('/decks', validateBody(createDeckSchema), (req, res) => {
    const body = req.body as z.infer<typeof createDeckSchema>;
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    db.prepare(
      'INSERT INTO decks (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, body.name, body.description, now, now);

    const created: DeckWithCounts = {
      id,
      name: body.name,
      description: body.description,
      createdAt: now,
      updatedAt: now,
      totalCards: 0,
      dueCount: 0,
      newCount: 0,
      learnedCount: 0,
    };
    res.status(201).json(created);
  });

  router.patch('/decks/:id', validateBody(updateDeckSchema), (req, res) => {
    const existing = db
      .prepare('SELECT * FROM decks WHERE id = ?')
      .get(req.params.id) as DeckRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }

    const body = req.body as z.infer<typeof updateDeckSchema>;
    const now = new Date().toISOString();
    const nextName = body.name ?? existing.name;
    const nextDesc = body.description ?? existing.description;

    db.prepare('UPDATE decks SET name = ?, description = ?, updated_at = ? WHERE id = ?').run(
      nextName,
      nextDesc,
      now,
      existing.id
    );

    res.json(
      mapDeck({
        ...existing,
        name: nextName,
        description: nextDesc,
        updated_at: now,
      })
    );
  });

  router.delete('/decks/:id', (req, res) => {
    const info = db.prepare('DELETE FROM decks WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }
    res.status(204).end();
  });

  // Cards in deck
  router.get('/decks/:id/cards', (req, res) => {
    const deck = db.prepare('SELECT id FROM decks WHERE id = ?').get(req.params.id);
    if (!deck) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }

    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const dueOnly = req.query.dueOnly === '1';
    const today = getTodayIsoDate();

    const rows = db
      .prepare('SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at DESC')
      .all(req.params.id) as CardRow[];

    const cards = rows
      .map(mapCard)
      .filter((c) => (!dueOnly ? true : c.dueDate <= today))
      .filter((c) => {
        if (!search) return true;
        return (
          c.word.toLowerCase().includes(search) ||
          c.meaning.toLowerCase().includes(search) ||
          c.tags.some((t) => t.toLowerCase().includes(search))
        );
      });

    res.json(cards);
  });

  router.post('/decks/:id/cards', validateBody(createCardSchema), (req, res) => {
    const deckId = String(req.params.id);
    const deck = db.prepare('SELECT id FROM decks WHERE id = ?').get(deckId);
    if (!deck) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }

    const body = req.body as z.infer<typeof createCardSchema>;
    const now = new Date().toISOString();
    const today = getTodayIsoDate();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO cards (
        id, deck_id, word, meaning, part_of_speech, example, notes, tags,
        repetitions, interval_days, ease_factor, due_date, last_reviewed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 2.5, ?, NULL, ?, ?)
    `).run(
      id,
      deckId,
      body.word,
      body.meaning,
      body.partOfSpeech,
      body.example,
      body.notes,
      JSON.stringify(body.tags),
      today,
      now,
      now
    );

    const created: VocabCard = {
      id,
      deckId,
      word: body.word,
      meaning: body.meaning,
      partOfSpeech: body.partOfSpeech,
      example: body.example,
      notes: body.notes,
      tags: body.tags,
      repetitions: 0,
      intervalDays: 0,
      easeFactor: 2.5,
      dueDate: today,
      lastReviewedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    res.status(201).json(created);
  });

  router.patch('/cards/:id', validateBody(updateCardSchema), (req, res) => {
    const existing = db
      .prepare('SELECT * FROM cards WHERE id = ?')
      .get(req.params.id) as CardRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }

    const body = req.body as z.infer<typeof updateCardSchema>;
    const now = new Date().toISOString();
    const next = {
      word: body.word ?? existing.word,
      meaning: body.meaning ?? existing.meaning,
      part_of_speech: body.partOfSpeech ?? existing.part_of_speech,
      example: body.example ?? existing.example,
      notes: body.notes ?? existing.notes,
      tags: body.tags ? JSON.stringify(body.tags) : existing.tags,
      updated_at: now,
    };

    db.prepare(
      `UPDATE cards
       SET word = ?, meaning = ?, part_of_speech = ?, example = ?, notes = ?, tags = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      next.word,
      next.meaning,
      next.part_of_speech,
      next.example,
      next.notes,
      next.tags,
      next.updated_at,
      existing.id
    );

    res.json(mapCard({ ...existing, ...next }));
  });

  router.delete('/cards/:id', (req, res) => {
    const info = db.prepare('DELETE FROM cards WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }
    res.status(204).end();
  });

  // Review queue & submission
  router.get('/reviews/queue', (req, res) => {
    const deckId = typeof req.query.deckId === 'string' && req.query.deckId ? req.query.deckId : undefined;
    const today = getTodayIsoDate();

    const rows = (
      deckId
        ? db
            .prepare(
              `SELECT * FROM cards
               WHERE deck_id = ? AND due_date <= ?
               ORDER BY due_date ASC, repetitions ASC, created_at ASC`
            )
            .all(deckId, today)
        : db
            .prepare(
              `SELECT * FROM cards
               WHERE due_date <= ?
               ORDER BY due_date ASC, repetitions ASC, created_at ASC`
            )
            .all(today)
    ) as CardRow[];

    const queue: VocabCardWithPreviews[] = rows.map((row) => {
      const card = mapCard(row);
      return {
        ...card,
        previews: previewSm2Intervals(
          {
            repetitions: card.repetitions,
            intervalDays: card.intervalDays,
            easeFactor: card.easeFactor,
          },
          today
        ),
      };
    });

    res.json(queue);
  });

  router.post('/reviews/:cardId', validateBody(reviewSchema), (req, res) => {
    const existing = db
      .prepare('SELECT * FROM cards WHERE id = ?')
      .get(req.params.cardId) as CardRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }

    const { rating } = req.body as { rating: ReviewRating };
    const now = new Date().toISOString();
    const today = getTodayIsoDate();

    const scheduled = scheduleSm2(
      {
        repetitions: existing.repetitions,
        intervalDays: existing.interval_days,
        easeFactor: existing.ease_factor,
      },
      rating,
      today
    );

    const applyReview = db.transaction(() => {
      db.prepare(
        `UPDATE cards
         SET repetitions = ?, interval_days = ?, ease_factor = ?, due_date = ?, last_reviewed_at = ?, updated_at = ?
         WHERE id = ?`
      ).run(
        scheduled.repetitions,
        scheduled.intervalDays,
        scheduled.easeFactor,
        scheduled.dueDate,
        now,
        now,
        existing.id
      );

      db.prepare(
        `INSERT INTO review_logs (id, card_id, deck_id, rating, reviewed_at, interval_after, ease_after)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        crypto.randomUUID(),
        existing.id,
        existing.deck_id,
        rating,
        now,
        scheduled.intervalDays,
        scheduled.easeFactor
      );
    });

    applyReview();

    const updated = mapCard({
      ...existing,
      repetitions: scheduled.repetitions,
      interval_days: scheduled.intervalDays,
      ease_factor: scheduled.easeFactor,
      due_date: scheduled.dueDate,
      last_reviewed_at: now,
      updated_at: now,
    });

    res.json({
      card: updated,
      stats: computeVocabStats(db, existing.deck_id),
    });
  });

  // Stats
  router.get('/vocab/stats', (req, res) => {
    const deckId = typeof req.query.deckId === 'string' && req.query.deckId ? req.query.deckId : undefined;
    res.json(computeVocabStats(db, deckId));
  });

  // Import & Export
  router.post('/decks/:id/import', validateBody(importSchema), (req, res) => {
    const deckId = String(req.params.id);
    const deck = db.prepare('SELECT id FROM decks WHERE id = ?').get(deckId);
    if (!deck) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }

    const { format, data } = req.body as z.infer<typeof importSchema>;
    let candidates: Array<{
      word: string;
      meaning: string;
      partOfSpeech: string;
      example: string;
      notes: string;
      tags: string[];
    }> = [];

    if (format === 'csv') {
      candidates = parseCardsCsv(data);
    } else {
      let parsed: unknown;
      try {
        parsed = JSON.parse(data);
      } catch {
        res.status(400).json({ error: 'Invalid JSON payload' });
        return;
      }

      const jsonSchema = z.array(createCardSchema);
      const checked = jsonSchema.safeParse(parsed);
      if (!checked.success) {
        res.status(400).json({
          error: 'JSON import must be an array of card objects with word and meaning',
          details: checked.error.flatten(),
        });
        return;
      }
      candidates = checked.data;
    }

    const now = new Date().toISOString();
    const today = getTodayIsoDate();
    const insertCard = db.prepare(`
      INSERT INTO cards (
        id, deck_id, word, meaning, part_of_speech, example, notes, tags,
        repetitions, interval_days, ease_factor, due_date, last_reviewed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 2.5, ?, NULL, ?, ?)
    `);

    let imported = 0;
    let skipped = 0;

    const runImport = db.transaction(() => {
      for (const item of candidates) {
        const word = item.word.trim();
        const meaning = item.meaning.trim();
        if (!word || !meaning) {
          skipped++;
          continue;
        }
        insertCard.run(
          crypto.randomUUID(),
          deckId,
          word,
          meaning,
          item.partOfSpeech,
          item.example,
          item.notes,
          JSON.stringify(item.tags),
          today,
          now,
          now
        );
        imported++;
      }
    });

    runImport();

    const response: ImportCardsResponse = { imported, skipped };
    res.status(201).json(response);
  });

  router.get('/decks/:id/export', (req, res) => {
    const deck = db
      .prepare('SELECT * FROM decks WHERE id = ?')
      .get(req.params.id) as DeckRow | undefined;
    if (!deck) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }

    const format = req.query.format === 'csv' ? 'csv' : 'json';
    const rows = db
      .prepare('SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at ASC')
      .all(deck.id) as CardRow[];

    const cards = rows.map(mapCard);
    const safeName = deck.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'deck';

    if (format === 'csv') {
      const csv = serializeCardsCsv(
        cards.map((c) => ({
          word: c.word,
          meaning: c.meaning,
          partOfSpeech: c.partOfSpeech,
          example: c.example,
          notes: c.notes,
          tags: c.tags,
        }))
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}.csv"`);
      res.send(csv);
      return;
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.json"`);
    res.send(
      JSON.stringify(
        cards.map((c) => ({
          word: c.word,
          meaning: c.meaning,
          partOfSpeech: c.partOfSpeech,
          example: c.example,
          notes: c.notes,
          tags: c.tags,
        })),
        null,
        2
      )
    );
  });

  return router;
}
