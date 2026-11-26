import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import { getTodayIsoDate } from '@studyspace/shared';

interface SeedCard {
  word: string;
  meaning: string;
  partOfSpeech: string;
  example: string;
  notes: string;
  tags: string[];
}

const SAMPLE_DECK_CARDS: SeedCard[] = [
  {
    word: 'Ephemeral',
    meaning: 'Lasting for a very short time; transitory.',
    partOfSpeech: 'adjective',
    example: 'Morning mist over the campus quad is ephemeral, fading before nine.',
    notes: 'Greek ephemeros ("lasting only a day").',
    tags: ['academic', 'literature'],
  },
  {
    word: 'Ubiquitous',
    meaning: 'Present, appearing, or found everywhere.',
    partOfSpeech: 'adjective',
    example: 'Portable laptops have become ubiquitous in university lecture halls.',
    notes: 'Latin ubique ("everywhere").',
    tags: ['academic', 'gre'],
  },
  {
    word: 'Pragmatic',
    meaning: 'Dealing with things sensibly and realistically in a practical way.',
    partOfSpeech: 'adjective',
    example: 'She took a pragmatic approach to balancing lab work and thesis writing.',
    notes: 'Contrast with idealistic or dogmatic.',
    tags: ['academic', 'philosophy'],
  },
  {
    word: 'Lucid',
    meaning: 'Expressed clearly; easy to understand.',
    partOfSpeech: 'adjective',
    example: 'His lucid explanation of eigenvalues clarified the entire chapter.',
    notes: 'Latin lucidus ("bright, clear").',
    tags: ['writing', 'gre'],
  },
  {
    word: 'Corroborate',
    meaning: 'Confirm or give support to a statement, theory, or finding.',
    partOfSpeech: 'verb',
    example: 'Two independent trials corroborated the initial hypothesis.',
    notes: 'Common in research methodology sections.',
    tags: ['research', 'science'],
  },
  {
    word: 'Mitigate',
    meaning: 'Make less severe, serious, or painful.',
    partOfSpeech: 'verb',
    example: 'Spaced repetition helps mitigate the steep forgetting curve before finals.',
    notes: 'Do not confuse with "militate" (to work against).',
    tags: ['academic', 'gre'],
  },
  {
    word: 'Nuance',
    meaning: 'A subtle difference in or shade of meaning, expression, or sound.',
    partOfSpeech: 'noun',
    example: 'Close reading reveals historical nuances missed in a quick summary.',
    notes: 'French nuer ("to shade").',
    tags: ['humanities', 'writing'],
  },
  {
    word: 'Synthesize',
    meaning: 'Combine a number of things into a coherent whole.',
    partOfSpeech: 'verb',
    example: 'A strong literature review synthesizes competing frameworks.',
    notes: 'Greek synthesis ("putting together").',
    tags: ['research', 'writing'],
  },
  {
    word: 'Disparate',
    meaning: 'Essentially different in kind; not allowing comparison.',
    partOfSpeech: 'adjective',
    example: 'The seminar brought together disparate viewpoints from law and economics.',
    notes: 'Distinct from "desperate".',
    tags: ['academic', 'gre'],
  },
  {
    word: 'Tenacious',
    meaning: 'Tending to keep a firm hold of something; persistent and determined.',
    partOfSpeech: 'adjective',
    example: 'Her tenacious revision routine paid off during qualifying exams.',
    notes: 'Latin tenax ("holding fast").',
    tags: ['gre', 'mindset'],
  },
];

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
    insertDeck.run(
      deckId,
      'Academic & GRE Core',
      'High-utility university vocabulary ready for spaced-repetition review.',
      now,
      now
    );
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
