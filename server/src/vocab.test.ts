import { describe, expect, it } from 'vitest';
import type {
  DeckWithCounts,
  ImportCardsResponse,
  ReviewSubmissionResponse,
  SrsStats,
  VocabCard,
  VocabCardWithPreviews,
} from '@studyspace/shared';
import { createDatabase } from './db/connection.js';
import { createApp } from './app.js';

async function withTestServer(
  seed: boolean,
  fn: (baseUrl: string) => Promise<void>
): Promise<void> {
  const db = createDatabase(':memory:', { seed });
  const app = createApp(db);
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  try {
    const addr = server.address();
    if (!addr || typeof addr === 'string') throw new Error('Invalid port');
    await fn(`http://127.0.0.1:${addr.port}`);
  } finally {
    server.close();
    db.close();
  }
}

describe('vocab API & SRS workflow', () => {
  it('seeds one sample vocabulary deck on first run', async () => {
    await withTestServer(true, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/decks`);
      expect(res.status).toBe(200);
      const decks = (await res.json()) as DeckWithCounts[];
      expect(decks.length).toBe(1);
      expect(decks[0]?.name).toBe('Academic & GRE Core');
      expect(decks[0]?.totalCards).toBe(10);
      expect(decks[0]?.dueCount).toBe(10);
    });
  });

  it('supports deck/card CRUD, SM-2 review rating, stats, and CSV/JSON import-export', async () => {
    await withTestServer(false, async (baseUrl) => {
      // 1. Create deck
      const deckRes = await fetch(`${baseUrl}/api/decks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Biology 101', description: 'Cell terms' }),
      });
      expect(deckRes.status).toBe(201);
      const deck = (await deckRes.json()) as DeckWithCounts;

      // 2. Add card
      const cardRes = await fetch(`${baseUrl}/api/decks/${deck.id}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: 'Mitochondria',
          meaning: 'Organelle generating cellular ATP',
          partOfSpeech: 'noun',
          example: 'Mitochondria supply energy to muscle cells.',
          notes: 'Double membrane',
          tags: ['biology', 'cell'],
        }),
      });
      expect(cardRes.status).toBe(201);
      const card = (await cardRes.json()) as VocabCard;
      expect(card.word).toBe('Mitochondria');

      // 3. Queue shows card with SM-2 previews
      const queueRes = await fetch(`${baseUrl}/api/reviews/queue?deckId=${deck.id}`);
      const queue = (await queueRes.json()) as VocabCardWithPreviews[];
      expect(queue.length).toBe(1);
      expect(queue[0]?.previews[3]).toBe(1);
      expect(queue[0]?.previews[4]).toBe(4);

      // 4. Submit review rating Good (3)
      const revRes = await fetch(`${baseUrl}/api/reviews/${card.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 3 }),
      });
      expect(revRes.status).toBe(200);
      const reviewed = (await revRes.json()) as ReviewSubmissionResponse;
      expect(reviewed.card.repetitions).toBe(1);
      expect(reviewed.card.intervalDays).toBe(1);
      expect(reviewed.stats.learnedCount).toBe(1);
      expect(reviewed.stats.retentionRate).toBe(100);
      expect(reviewed.stats.reviewStreak).toBe(1);
      expect(reviewed.stats.dueToday).toBe(0);

      // 5. Import CSV
      const csvData = [
        'word,meaning,partOfSpeech,example,notes,tags',
        'Osmosis,"Water movement across a membrane",noun,"Osmosis balances solute levels.",,biology;chemistry',
      ].join('\n');
      const importRes = await fetch(`${baseUrl}/api/decks/${deck.id}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'csv', data: csvData }),
      });
      expect(importRes.status).toBe(201);
      const impJson = (await importRes.json()) as ImportCardsResponse;
      expect(impJson.imported).toBe(1);

      // 6. Export CSV & JSON
      const expCsvRes = await fetch(`${baseUrl}/api/decks/${deck.id}/export?format=csv`);
      expect(expCsvRes.status).toBe(200);
      const expCsv = await expCsvRes.text();
      expect(expCsv).toContain('Mitochondria');
      expect(expCsv).toContain('Osmosis');

      const expJsonRes = await fetch(`${baseUrl}/api/decks/${deck.id}/export?format=json`);
      const expJson = (await expJsonRes.json()) as Array<{ word: string }>;
      expect(expJson.length).toBe(2);

      // 7. Stats check
      const statsRes = await fetch(`${baseUrl}/api/vocab/stats?deckId=${deck.id}`);
      const stats = (await statsRes.json()) as SrsStats;
      expect(stats.totalCards).toBe(2);
      expect(stats.newCount).toBe(1);
      expect(stats.learnedCount).toBe(1);
    });
  });

  it('rejects invalid review rating via zod validation', async () => {
    await withTestServer(true, async (baseUrl) => {
      const queueRes = await fetch(`${baseUrl}/api/reviews/queue`);
      const queue = (await queueRes.json()) as VocabCardWithPreviews[];
      const firstId = queue[0]?.id;
      expect(firstId).toBeTruthy();

      const badRes = await fetch(`${baseUrl}/api/reviews/${firstId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 9 }),
      });
      expect(badRes.status).toBe(400);
    });
  });
});
