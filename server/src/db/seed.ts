import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import {
  getTodayIsoDate,
  SAMPLE_DECK_CARDS,
  SAMPLE_DECK_DESCRIPTION,
  SAMPLE_DECK_NAME,
} from '@studyspace/shared';

export function seedDatabaseIfEmpty(db: Database.Database): void {
  const row = db.prepare('SELECT COUNT(*) as count FROM decks').get() as { count: number };
  if (row.count > 0) return;

  const now = new Date().toISOString();
  const today = getTodayIsoDate();
  const deckId = crypto.randomUUID();

  const insertDeck = db.prepare(
    'INSERT INTO decks (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  );
  const insertCard = db.prepare(`
    INSERT INTO cards (
      id, deck_id, word, meaning, part_of_speech, example, notes, tags,
      repetitions, interval_days, ease_factor, due_date, last_reviewed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 2.5, ?, NULL, ?, ?)
  `);

  const runSeed = db.transaction(() => {
    insertDeck.run(deckId, SAMPLE_DECK_NAME, SAMPLE_DECK_DESCRIPTION, now, now);
    for (const item of SAMPLE_DECK_CARDS) {
      insertCard.run(
        crypto.randomUUID(),
        deckId,
        item.word,
        item.meaning,
        item.partOfSpeech,
        item.example,
        item.notes,
        JSON.stringify(item.tags),
        today,
        now,
        now
      );
    }
  });

  runSeed();
}
