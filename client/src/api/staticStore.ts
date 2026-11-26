import {
  addDaysIso,
  getTodayIsoDate,
  parseCardsCsv,
  previewSm2Intervals,
  SAMPLE_DECK_CARDS,
  SAMPLE_DECK_DESCRIPTION,
  SAMPLE_DECK_NAME,
  scheduleSm2,
  serializeCardsCsv,
  type AnalyticsSummary,
  type DailyFocusPoint,
  type DailyGoal,
  type Deck,
  type DeckWithCounts,
  type ImportCardsResponse,
  type ReviewRating,
  type ReviewSubmissionResponse,
  type ScratchpadNote,
  type SrsStats,
  type StudySession,
  type TodoItem,
  type TodosDayResponse,
  type VocabCard,
  type VocabCardWithPreviews,
} from '@studyspace/shared';

const STATIC_DB_KEY = 'studynest:static-db:v1';

interface StaticReviewLog {
  id: string;
  cardId: string;
  deckId: string;
  rating: ReviewRating;
  reviewedAt: string;
}

interface StaticDb {
  version: 1;
  decks: Deck[];
  cards: VocabCard[];
  reviewLogs: StaticReviewLog[];
  todos: TodoItem[];
  goals: Record<string, DailyGoal>;
  notes: ScratchpadNote[];
  sessions: StudySession[];
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createInitialDb(): StaticDb {
  const now = new Date().toISOString();
  const today = getTodayIsoDate();
  const deckId = makeId();

  return {
    version: 1,
    decks: [
      {
        id: deckId,
        name: SAMPLE_DECK_NAME,
        description: SAMPLE_DECK_DESCRIPTION,
        createdAt: now,
        updatedAt: now,
      },
    ],
    cards: SAMPLE_DECK_CARDS.map((item) => ({
      id: makeId(),
      deckId,
      word: item.word,
      meaning: item.meaning,
      partOfSpeech: item.partOfSpeech,
      example: item.example,
      notes: item.notes,
      tags: [...item.tags],
      repetitions: 0,
      intervalDays: 0,
      easeFactor: 2.5,
      dueDate: today,
      lastReviewedAt: null,
      createdAt: now,
      updatedAt: now,
    })),
    reviewLogs: [],
    todos: [],
    goals: {},
    notes: [
      {
        id: makeId(),
        title: 'Scratchpad',
        content:
          '# Study Scratchpad\n\nJot down lecture thoughts, equations, or questions here.\n\n- [ ] Review key concepts\n',
        updatedAt: now,
      },
    ],
    sessions: [],
  };
}

function readDb(): StaticDb {
  try {
    const raw = window.localStorage.getItem(STATIC_DB_KEY);
    if (!raw) {
      const seeded = createInitialDb();
      window.localStorage.setItem(STATIC_DB_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as Partial<StaticDb>;
    if (parsed.version !== 1 || !Array.isArray(parsed.decks) || !Array.isArray(parsed.cards)) {
      const seeded = createInitialDb();
      window.localStorage.setItem(STATIC_DB_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return {
      version: 1,
      decks: parsed.decks,
      cards: parsed.cards,
      reviewLogs: parsed.reviewLogs ?? [],
      todos: parsed.todos ?? [],
      goals: parsed.goals ?? {},
      notes: parsed.notes ?? [],
      sessions: parsed.sessions ?? [],
    };
  } catch {
    return createInitialDb();
  }
}

function writeDb(db: StaticDb): void {
  try {
    window.localStorage.setItem(STATIC_DB_KEY, JSON.stringify(db));
  } catch {
    // Ignore quota errors in restricted browsing modes
  }
}

export function isStaticMode(): boolean {
  return import.meta.env.VITE_STATIC_MODE === 'true';
}

function computeStats(db: StaticDb, deckId?: string): SrsStats {
  const today = getTodayIsoDate();
  const cards = deckId ? db.cards.filter((c) => c.deckId === deckId) : db.cards;
  const logs = deckId ? db.reviewLogs.filter((l) => l.deckId === deckId) : db.reviewLogs;

  const dueToday = cards.filter((c) => c.dueDate <= today).length;
  const newCount = cards.filter((c) => c.repetitions === 0).length;
  const learnedCount = cards.filter((c) => c.repetitions >= 1).length;
  const passed = logs.filter((l) => l.rating >= 2).length;
  const retentionRate = logs.length === 0 ? 0 : Math.round((passed / logs.length) * 100);

  const daySet = new Set<string>();
  let reviewedToday = 0;
  for (const log of logs) {
    const day = getTodayIsoDate(new Date(log.reviewedAt));
    daySet.add(day);
    if (day === today) reviewedToday++;
  }

  let reviewStreak = 0;
  let cursor = daySet.has(today) ? today : addDaysIso(today, -1);
  while (daySet.has(cursor)) {
    reviewStreak++;
    cursor = addDaysIso(cursor, -1);
  }

  return {
    dueToday,
    newCount,
    learnedCount,
    totalCards: cards.length,
    retentionRate,
    reviewStreak,
    reviewedToday,
  };
}

export const staticVocabStore = {
  listDecks(): DeckWithCounts[] {
    const db = readDb();
    const today = getTodayIsoDate();
    return db.decks.map((d) => {
      const cards = db.cards.filter((c) => c.deckId === d.id);
      return {
        ...d,
        totalCards: cards.length,
        dueCount: cards.filter((c) => c.dueDate <= today).length,
        newCount: cards.filter((c) => c.repetitions === 0).length,
        learnedCount: cards.filter((c) => c.repetitions >= 1).length,
      };
    });
  },

  createDeck(name: string, description: string): DeckWithCounts {
    const db = readDb();
    const now = new Date().toISOString();
    const deck: Deck = { id: makeId(), name, description, createdAt: now, updatedAt: now };
    db.decks.push(deck);
    writeDb(db);
    return { ...deck, totalCards: 0, dueCount: 0, newCount: 0, learnedCount: 0 };
  },

  updateDeck(id: string, patch: { name?: string; description?: string }): Deck {
    const db = readDb();
    const idx = db.decks.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error('Deck not found');
    const existing = db.decks[idx]!;
    const updated: Deck = {
      ...existing,
      name: patch.name ?? existing.name,
      description: patch.description ?? existing.description,
      updatedAt: new Date().toISOString(),
    };
    db.decks[idx] = updated;
    writeDb(db);
    return updated;
  },

  deleteDeck(id: string): void {
    const db = readDb();
    db.decks = db.decks.filter((d) => d.id !== id);
    db.cards = db.cards.filter((c) => c.deckId !== id);
    db.reviewLogs = db.reviewLogs.filter((l) => l.deckId !== id);
    writeDb(db);
  },

  listCards(deckId: string, search = ''): VocabCard[] {
    const db = readDb();
    const q = search.trim().toLowerCase();
    return db.cards
      .filter((c) => c.deckId === deckId)
      .filter((c) => {
        if (!q) return true;
        return (
          c.word.toLowerCase().includes(q) ||
          c.meaning.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  createCard(
    deckId: string,
    payload: {
      word: string;
      meaning: string;
      partOfSpeech: string;
      example: string;
      notes: string;
      tags: string[];
    }
  ): VocabCard {
    const db = readDb();
    const now = new Date().toISOString();
    const today = getTodayIsoDate();
    const card: VocabCard = {
      id: makeId(),
      deckId,
      word: payload.word,
      meaning: payload.meaning,
      partOfSpeech: payload.partOfSpeech,
      example: payload.example,
      notes: payload.notes,
      tags: payload.tags,
      repetitions: 0,
      intervalDays: 0,
      easeFactor: 2.5,
      dueDate: today,
      lastReviewedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    db.cards.push(card);
    writeDb(db);
    return card;
  },

  updateCard(
    cardId: string,
    payload: Partial<{
      word: string;
      meaning: string;
      partOfSpeech: string;
      example: string;
      notes: string;
      tags: string[];
    }>
  ): VocabCard {
    const db = readDb();
    const idx = db.cards.findIndex((c) => c.id === cardId);
    if (idx === -1) throw new Error('Card not found');
    const existing = db.cards[idx]!;
    const updated: VocabCard = {
      ...existing,
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    db.cards[idx] = updated;
    writeDb(db);
    return updated;
  },

  deleteCard(cardId: string): void {
    const db = readDb();
    db.cards = db.cards.filter((c) => c.id !== cardId);
    db.reviewLogs = db.reviewLogs.filter((l) => l.cardId !== cardId);
    writeDb(db);
  },

  getReviewQueue(deckId?: string): VocabCardWithPreviews[] {
    const db = readDb();
    const today = getTodayIsoDate();
    return db.cards
      .filter((c) => (!deckId ? true : c.deckId === deckId) && c.dueDate <= today)
      .sort(
        (a, b) =>
          a.dueDate.localeCompare(b.dueDate) ||
          a.repetitions - b.repetitions ||
          a.createdAt.localeCompare(b.createdAt)
      )
      .map((card) => ({
        ...card,
        previews: previewSm2Intervals(
          {
            repetitions: card.repetitions,
            intervalDays: card.intervalDays,
            easeFactor: card.easeFactor,
          },
          today
        ),
      }));
  },

  submitReview(cardId: string, rating: ReviewRating): ReviewSubmissionResponse {
    const db = readDb();
    const idx = db.cards.findIndex((c) => c.id === cardId);
    if (idx === -1) throw new Error('Card not found');
    const existing = db.cards[idx]!;
    const now = new Date().toISOString();
    const today = getTodayIsoDate();

    const scheduled = scheduleSm2(
      {
        repetitions: existing.repetitions,
        intervalDays: existing.intervalDays,
        easeFactor: existing.easeFactor,
      },
      rating,
      today
    );

    const updated: VocabCard = {
      ...existing,
      repetitions: scheduled.repetitions,
      intervalDays: scheduled.intervalDays,
      easeFactor: scheduled.easeFactor,
      dueDate: scheduled.dueDate,
      lastReviewedAt: now,
      updatedAt: now,
    };

    db.cards[idx] = updated;
    db.reviewLogs.push({
      id: makeId(),
      cardId: existing.id,
      deckId: existing.deckId,
      rating,
      reviewedAt: now,
    });
    writeDb(db);

    return {
      card: updated,
      stats: computeStats(db, existing.deckId),
    };
  },

  getStats(deckId?: string): SrsStats {
    return computeStats(readDb(), deckId);
  },

  importCards(deckId: string, format: 'csv' | 'json', data: string): ImportCardsResponse {
    const db = readDb();
    const today = getTodayIsoDate();
    const now = new Date().toISOString();

    let rows: Array<{
      word: string;
      meaning: string;
      partOfSpeech?: string;
      example?: string;
      notes?: string;
      tags?: string[];
    }> = [];

    if (format === 'csv') {
      rows = parseCardsCsv(data);
    } else {
      const parsed = JSON.parse(data) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error('JSON import must be an array of card objects');
      }
      rows = parsed as typeof rows;
    }

    let imported = 0;
    let skipped = 0;
    for (const item of rows) {
      const word = typeof item.word === 'string' ? item.word.trim() : '';
      const meaning = typeof item.meaning === 'string' ? item.meaning.trim() : '';
      if (!word || !meaning) {
        skipped++;
        continue;
      }
      db.cards.push({
        id: makeId(),
        deckId,
        word,
        meaning,
        partOfSpeech: typeof item.partOfSpeech === 'string' ? item.partOfSpeech.trim() : '',
        example: typeof item.example === 'string' ? item.example.trim() : '',
        notes: typeof item.notes === 'string' ? item.notes.trim() : '',
        tags: Array.isArray(item.tags) ? item.tags.filter((t) => typeof t === 'string') : [],
        repetitions: 0,
        intervalDays: 0,
        easeFactor: 2.5,
        dueDate: today,
        lastReviewedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      imported++;
    }

    writeDb(db);
    return { imported, skipped };
  },

  exportCards(deckId: string, format: 'csv' | 'json'): { filename: string; content: string; mime: string } {
    const db = readDb();
    const deck = db.decks.find((d) => d.id === deckId);
    if (!deck) throw new Error('Deck not found');
    const cards = db.cards.filter((c) => c.deckId === deckId);
    const safeName =
      deck.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'deck';

    if (format === 'csv') {
      return {
        filename: `${safeName}.csv`,
        mime: 'text/csv;charset=utf-8',
        content: serializeCardsCsv(
          cards.map((c) => ({
            word: c.word,
            meaning: c.meaning,
            partOfSpeech: c.partOfSpeech,
            example: c.example,
            notes: c.notes,
            tags: c.tags,
          }))
        ),
      };
    }

    return {
      filename: `${safeName}.json`,
      mime: 'application/json;charset=utf-8',
      content: JSON.stringify(
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
      ),
    };
  },
};

export const staticToolsStore = {
  getTodosDay(date = getTodayIsoDate()): TodosDayResponse {
    const db = readDb();
    const todos = db.todos
      .filter((t) => t.dueDate === date)
      .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
    const goal: DailyGoal = db.goals[date] ?? {
      date,
      targetMinutes: 120,
      targetTasks: 5,
      updatedAt: new Date().toISOString(),
    };
    return { date, todos, goal };
  },

  createTodo(title: string, dueDate = getTodayIsoDate()): TodoItem {
    const db = readDb();
    const now = new Date().toISOString();
    const dayTodos = db.todos.filter((t) => t.dueDate === dueDate);
    const maxPos = dayTodos.reduce((m, t) => Math.max(m, t.position), -1);
    const item: TodoItem = {
      id: makeId(),
      title,
      completed: false,
      dueDate,
      position: maxPos + 1,
      createdAt: now,
      updatedAt: now,
    };
    db.todos.push(item);
    writeDb(db);
    return item;
  },

  updateTodo(
    id: string,
    patch: { title?: string; completed?: boolean; dueDate?: string; position?: number }
  ): TodoItem {
    const db = readDb();
    const idx = db.todos.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Task not found');
    const updated: TodoItem = {
      ...db.todos[idx]!,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    db.todos[idx] = updated;
    writeDb(db);
    return updated;
  },

  deleteTodo(id: string): void {
    const db = readDb();
    db.todos = db.todos.filter((t) => t.id !== id);
    writeDb(db);
  },

  updateGoal(date: string, targetMinutes: number, targetTasks: number): DailyGoal {
    const db = readDb();
    const goal: DailyGoal = {
      date,
      targetMinutes,
      targetTasks,
      updatedAt: new Date().toISOString(),
    };
    db.goals[date] = goal;
    writeDb(db);
    return goal;
  },

  listNotes(): ScratchpadNote[] {
    const db = readDb();
    if (db.notes.length === 0) {
      db.notes.push({
        id: makeId(),
        title: 'Scratchpad',
        content:
          '# Study Scratchpad\n\nJot down lecture thoughts, equations, or questions here.\n\n- [ ] Review key concepts\n',
        updatedAt: new Date().toISOString(),
      });
      writeDb(db);
    }
    return [...db.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  createNote(title: string, content = ''): ScratchpadNote {
    const db = readDb();
    const note: ScratchpadNote = {
      id: makeId(),
      title,
      content,
      updatedAt: new Date().toISOString(),
    };
    db.notes.unshift(note);
    writeDb(db);
    return note;
  },

  saveNote(id: string, patch: { title?: string; content?: string }): ScratchpadNote {
    const db = readDb();
    const idx = db.notes.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error('Note not found');
    const updated: ScratchpadNote = {
      ...db.notes[idx]!,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    db.notes[idx] = updated;
    writeDb(db);
    return updated;
  },

  deleteNote(id: string): void {
    const db = readDb();
    db.notes = db.notes.filter((n) => n.id !== id);
    writeDb(db);
  },

  logSession(
    durationMinutes: number,
    source: 'pomodoro' | 'manual' = 'pomodoro',
    date = getTodayIsoDate()
  ): StudySession {
    const db = readDb();
    const session: StudySession = {
      id: makeId(),
      date,
      durationMinutes,
      source,
      completedAt: new Date().toISOString(),
    };
    db.sessions.push(session);
    writeDb(db);
    return session;
  },

  getAnalyticsSummary(daysCount = 84): AnalyticsSummary {
    const db = readDb();
    const today = getTodayIsoDate();
    const byDate = new Map<string, { minutes: number; sessions: number }>();
    let totalMinutes = 0;

    for (const s of db.sessions) {
      const prev = byDate.get(s.date) ?? { minutes: 0, sessions: 0 };
      byDate.set(s.date, {
        minutes: prev.minutes + s.durationMinutes,
        sessions: prev.sessions + 1,
      });
      totalMinutes += s.durationMinutes;
    }

    const days: DailyFocusPoint[] = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = addDaysIso(today, -i);
      const entry = byDate.get(d);
      days.push({
        date: d,
        minutes: entry?.minutes ?? 0,
        sessions: entry?.sessions ?? 0,
      });
    }

    let currentStreak = 0;
    let cursor = (byDate.get(today)?.minutes ?? 0) > 0 ? today : addDaysIso(today, -1);
    while ((byDate.get(cursor)?.minutes ?? 0) > 0) {
      currentStreak++;
      cursor = addDaysIso(cursor, -1);
    }

    const activeDates = Array.from(byDate.entries())
      .filter(([, v]) => v.minutes > 0)
      .map(([d]) => d)
      .sort();

    let longestStreak = 0;
    let run = 0;
    let prevDate: string | null = null;
    for (const d of activeDates) {
      if (prevDate && addDaysIso(prevDate, 1) === d) {
        run++;
      } else {
        run = 1;
      }
      if (run > longestStreak) longestStreak = run;
      prevDate = d;
    }

    return {
      todayMinutes: byDate.get(today)?.minutes ?? 0,
      totalMinutes,
      totalSessions: db.sessions.length,
      currentStreak,
      longestStreak,
      dailyGoalMinutes: db.goals[today]?.targetMinutes ?? 120,
      days,
    };
  },
};
