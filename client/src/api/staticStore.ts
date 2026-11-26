import {
  addDaysIso,
  getDayOfWeekFromIso,
  getNextRecurringDueDate,
  getTodayIsoDate,
  parseCardsCsv,
  parseIcs,
  previewSm2Intervals,
  SAMPLE_COURSES,
  SAMPLE_DECK_CARDS,
  SAMPLE_DECK_DESCRIPTION,
  SAMPLE_DECK_NAME,
  SAMPLE_NOTES,
  SAMPLE_TASKS,
  SAMPLE_WEEKLY_EVENTS,
  scheduleSm2,
  serializeCardsCsv,
  serializeIcs,
  type AnalyticsSummary,
  type Course,
  type DailyFocusPoint,
  type DailyGoal,
  type Deck,
  type DeckWithCounts,
  type ImportCardsResponse,
  type Notebook,
  type NoteTag,
  type PlannerNote,
  type PlannerTask,
  type ReviewRating,
  type ReviewSubmissionResponse,
  type ScratchpadNote,
  type SemesterSettings,
  type SrsStats,
  type StudySession,
  type Subtask,
  type TaskPriority,
  type TaskRepeat,
  type TaskStatus,
  type TaskUpdateResponse,
  type TimetableEvent,
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
  courses: Course[];
  timetableEvents: TimetableEvent[];
  tasks: PlannerTask[];
  notebooks: Notebook[];
  plannerNotes: PlannerNote[];
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function seedPlannerCollections(now: string): {
  courses: Course[];
  timetableEvents: TimetableEvent[];
} {
  const keyToId = new Map<string, string>();
  const courses: Course[] = SAMPLE_COURSES.map((c) => {
    const id = makeId();
    keyToId.set(c.key, id);
    return {
      id,
      name: c.name,
      code: c.code,
      color: c.color,
      instructor: c.instructor,
      room: c.room,
      createdAt: now,
      updatedAt: now,
    };
  });

  const timetableEvents: TimetableEvent[] = SAMPLE_WEEKLY_EVENTS.map((ev) => ({
    id: makeId(),
    courseId: keyToId.get(ev.courseKey) ?? null,
    title: ev.title,
    type: ev.type,
    dayOfWeek: ev.dayOfWeek,
    start: ev.start,
    end: ev.end,
    location: ev.location,
    repeat: 'weekly',
    date: null,
    notes: ev.notes,
    createdAt: now,
    updatedAt: now,
  }));

  return { courses, timetableEvents };
}

function seedTasksCollection(courses: Course[], now: string, today: string): PlannerTask[] {
  const keyToId = new Map<string, string>();
  for (const c of courses) {
    const prefix = c.code.split(' ')[0]?.toLowerCase() ?? '';
    if (prefix) keyToId.set(prefix, c.id);
  }
  return SAMPLE_TASKS.map((item, idx) => {
    const id = makeId();
    return {
      id,
      title: item.title,
      notes: item.notes,
      dueDate: item.dueOffsetDays === null ? null : addDaysIso(today, item.dueOffsetDays),
      priority: item.priority,
      courseId: item.courseKey ? (keyToId.get(item.courseKey) ?? null) : null,
      status: item.status,
      repeat: item.repeat,
      sortOrder: idx,
      createdAt: now,
      completedAt: item.status === 'done' ? now : null,
      subtasks: item.subtasks.map((st, sIdx) => ({
        id: makeId(),
        taskId: id,
        title: st,
        done: false,
        sortOrder: sIdx,
      })),
    };
  });
}

function seedNotesCollection(courses: Course[], now: string): {
  notebooks: Notebook[];
  plannerNotes: PlannerNote[];
} {
  const keyToId = new Map<string, string>();
  for (const c of courses) {
    const prefix = c.code.split(' ')[0]?.toLowerCase() ?? '';
    if (prefix) keyToId.set(prefix, c.id);
  }
  const nbMap = new Map<string, Notebook>();
  const plannerNotes: PlannerNote[] = SAMPLE_NOTES.map((item) => {
    let nb = nbMap.get(item.notebookName);
    if (!nb) {
      nb = { id: makeId(), name: item.notebookName, createdAt: now };
      nbMap.set(item.notebookName, nb);
    }
    return {
      id: makeId(),
      title: item.title,
      body: item.body,
      content: item.body,
      notebookId: nb.id,
      courseId: item.courseKey ? (keyToId.get(item.courseKey) ?? null) : null,
      pinned: item.pinned,
      tags: item.tags.map((t) => t.toLowerCase()),
      createdAt: now,
      updatedAt: now,
    };
  });
  return { notebooks: Array.from(nbMap.values()), plannerNotes };
}

function createInitialDb(): StaticDb {
  const now = new Date().toISOString();
  const today = getTodayIsoDate();
  const deckId = makeId();
  const { courses, timetableEvents } = seedPlannerCollections(now);
  const tasks = seedTasksCollection(courses, now, today);
  const { notebooks, plannerNotes } = seedNotesCollection(courses, now);

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
    courses,
    timetableEvents,
    tasks,
    notebooks,
    plannerNotes,
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
    let changed = false;
    let courses = parsed.courses;
    let timetableEvents = parsed.timetableEvents;
    if (!Array.isArray(courses)) {
      const seededPlanner = seedPlannerCollections(new Date().toISOString());
      courses = seededPlanner.courses;
      timetableEvents = seededPlanner.timetableEvents;
      changed = true;
    }
    let tasks = parsed.tasks;
    if (!Array.isArray(tasks)) {
      tasks = seedTasksCollection(courses, new Date().toISOString(), getTodayIsoDate());
      changed = true;
    }
    let notebooks = parsed.notebooks;
    let plannerNotes = parsed.plannerNotes;
    if (!Array.isArray(plannerNotes)) {
      const seededNotes = seedNotesCollection(courses, new Date().toISOString());
      notebooks = seededNotes.notebooks;
      plannerNotes = seededNotes.plannerNotes;
      changed = true;
    }
    const db: StaticDb = {
      version: 1,
      decks: parsed.decks,
      cards: parsed.cards,
      reviewLogs: parsed.reviewLogs ?? [],
      todos: parsed.todos ?? [],
      goals: parsed.goals ?? {},
      notes: parsed.notes ?? [],
      sessions: parsed.sessions ?? [],
      courses,
      timetableEvents: timetableEvents ?? [],
      tasks,
      notebooks: notebooks ?? [],
      plannerNotes,
    };
    if (changed) {
      window.localStorage.setItem(STATIC_DB_KEY, JSON.stringify(db));
    }
    return db;
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
    date = getTodayIsoDate(),
    taskId: string | null = null
  ): StudySession {
    const db = readDb();
    const session: StudySession = {
      id: makeId(),
      date,
      durationMinutes,
      source,
      taskId,
      completedAt: new Date().toISOString(),
    };
    db.sessions.push(session);
    writeDb(db);
    return session;
  },

  getMinutesByTask(): Record<string, number> {
    const db = readDb();
    const map: Record<string, number> = {};
    for (const s of db.sessions) {
      if (s.taskId) {
        map[s.taskId] = (map[s.taskId] ?? 0) + s.durationMinutes;
      }
    }
    return map;
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

export const staticPlannerStore = {
  listCourses(): Course[] {
    return [...readDb().courses].sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name));
  },

  createCourse(payload: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>): Course {
    const db = readDb();
    const now = new Date().toISOString();
    const course: Course = { id: makeId(), ...payload, createdAt: now, updatedAt: now };
    db.courses.push(course);
    writeDb(db);
    return course;
  },

  updateCourse(id: string, patch: Partial<Omit<Course, 'id' | 'createdAt' | 'updatedAt'>>): Course {
    const db = readDb();
    const idx = db.courses.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Course not found');
    const updated: Course = {
      ...db.courses[idx]!,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    db.courses[idx] = updated;
    writeDb(db);
    return updated;
  },

  deleteCourse(id: string): void {
    const db = readDb();
    db.courses = db.courses.filter((c) => c.id !== id);
    db.timetableEvents = db.timetableEvents.map((e) => (e.courseId === id ? { ...e, courseId: null } : e));
    writeDb(db);
  },

  listEvents(): TimetableEvent[] {
    return [...readDb().timetableEvents].sort(
      (a, b) => a.dayOfWeek - b.dayOfWeek || a.start.localeCompare(b.start)
    );
  },

  createEvent(payload: Omit<TimetableEvent, 'id' | 'createdAt' | 'updatedAt'>): TimetableEvent {
    const db = readDb();
    const now = new Date().toISOString();
    const date = payload.repeat === 'none' ? payload.date : null;
    const dayOfWeek = date ? getDayOfWeekFromIso(date) : payload.dayOfWeek;
    const ev: TimetableEvent = {
      id: makeId(),
      ...payload,
      date,
      dayOfWeek,
      createdAt: now,
      updatedAt: now,
    };
    db.timetableEvents.push(ev);
    writeDb(db);
    return ev;
  },

  updateEvent(
    id: string,
    patch: Partial<Omit<TimetableEvent, 'id' | 'createdAt' | 'updatedAt'>>
  ): TimetableEvent {
    const db = readDb();
    const idx = db.timetableEvents.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('Event not found');
    const existing = db.timetableEvents[idx]!;
    const repeat = patch.repeat ?? existing.repeat;
    const date = repeat === 'none' ? (patch.date !== undefined ? patch.date : existing.date) : null;
    const dayOfWeek = date ? getDayOfWeekFromIso(date) : (patch.dayOfWeek ?? existing.dayOfWeek);
    const updated: TimetableEvent = {
      ...existing,
      ...patch,
      repeat,
      date,
      dayOfWeek,
      updatedAt: new Date().toISOString(),
    };
    db.timetableEvents[idx] = updated;
    writeDb(db);
    return updated;
  },

  deleteEvent(id: string): void {
    const db = readDb();
    db.timetableEvents = db.timetableEvents.filter((e) => e.id !== id);
    writeDb(db);
  },

  importIcs(ics: string, courseId: string | null): { imported: number; events: TimetableEvent[] } {
    const db = readDb();
    const now = new Date().toISOString();
    const parsed = parseIcs(ics);
    const created: TimetableEvent[] = parsed.map((item) => ({
      id: makeId(),
      courseId,
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
    }));
    db.timetableEvents.push(...created);
    writeDb(db);
    return { imported: created.length, events: created };
  },

  exportIcs(semester: Pick<SemesterSettings, 'startDate' | 'endDate'>): string {
    const db = readDb();
    return serializeIcs(db.timetableEvents, db.courses, semester);
  },
};

export const staticTasksStore = {
  listTasks(): PlannerTask[] {
    return [...readDb().tasks].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)
    );
  },

  createTask(payload: {
    title: string;
    notes?: string;
    dueDate?: string | null;
    priority?: TaskPriority;
    courseId?: string | null;
    status?: TaskStatus;
    repeat?: TaskRepeat;
    subtasks?: string[];
  }): PlannerTask {
    const db = readDb();
    const now = new Date().toISOString();
    const id = makeId();
    const maxOrder = db.tasks.reduce((m, t) => Math.max(m, t.sortOrder), -1);
    const status = payload.status ?? 'todo';
    const task: PlannerTask = {
      id,
      title: payload.title,
      notes: payload.notes ?? '',
      dueDate: payload.dueDate ?? null,
      priority: payload.priority ?? 'med',
      courseId: payload.courseId ?? null,
      status,
      repeat: payload.repeat ?? 'none',
      sortOrder: maxOrder + 1,
      createdAt: now,
      completedAt: status === 'done' ? now : null,
      subtasks: (payload.subtasks ?? []).map((title, idx) => ({
        id: makeId(),
        taskId: id,
        title,
        done: false,
        sortOrder: idx,
      })),
    };
    db.tasks.push(task);
    writeDb(db);
    return task;
  },

  updateTask(
    id: string,
    patch: Partial<{
      title: string;
      notes: string;
      dueDate: string | null;
      priority: TaskPriority;
      courseId: string | null;
      status: TaskStatus;
      repeat: TaskRepeat;
      sortOrder: number;
    }>
  ): TaskUpdateResponse {
    const db = readDb();
    const idx = db.tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Task not found');
    const existing = db.tasks[idx]!;
    const now = new Date().toISOString();
    const nextStatus = patch.status ?? existing.status;
    const becameDone = existing.status !== 'done' && nextStatus === 'done';

    const updated: PlannerTask = {
      ...existing,
      ...patch,
      status: nextStatus,
      completedAt: nextStatus === 'done' ? (existing.completedAt ?? now) : null,
    };
    db.tasks[idx] = updated;

    let nextTask: PlannerTask | null = null;
    if (becameDone && updated.repeat !== 'none') {
      const newId = makeId();
      const maxOrder = db.tasks.reduce((m, t) => Math.max(m, t.sortOrder), -1);
      nextTask = {
        id: newId,
        title: updated.title,
        notes: updated.notes,
        dueDate: getNextRecurringDueDate(updated.dueDate, updated.repeat, getTodayIsoDate()),
        priority: updated.priority,
        courseId: updated.courseId,
        status: 'todo',
        repeat: updated.repeat,
        sortOrder: maxOrder + 1,
        createdAt: now,
        completedAt: null,
        subtasks: updated.subtasks.map((s, sIdx) => ({
          id: makeId(),
          taskId: newId,
          title: s.title,
          done: false,
          sortOrder: sIdx,
        })),
      };
      db.tasks.push(nextTask);
    }

    writeDb(db);
    return { task: updated, nextTask };
  },

  reorderTasks(orderedIds: string[]): void {
    const db = readDb();
    const orderMap = new Map(orderedIds.map((id, idx) => [id, idx]));
    db.tasks = db.tasks.map((t) =>
      orderMap.has(t.id) ? { ...t, sortOrder: orderMap.get(t.id)! } : t
    );
    writeDb(db);
  },

  deleteTask(id: string): void {
    const db = readDb();
    db.tasks = db.tasks.filter((t) => t.id !== id);
    writeDb(db);
  },

  addSubtask(taskId: string, title: string): Subtask {
    const db = readDb();
    const task = db.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Task not found');
    const maxOrder = task.subtasks.reduce((m, s) => Math.max(m, s.sortOrder), -1);
    const sub: Subtask = { id: makeId(), taskId, title, done: false, sortOrder: maxOrder + 1 };
    task.subtasks.push(sub);
    writeDb(db);
    return sub;
  },

  updateSubtask(id: string, patch: { title?: string; done?: boolean }): Subtask {
    const db = readDb();
    for (const t of db.tasks) {
      const idx = t.subtasks.findIndex((s) => s.id === id);
      if (idx !== -1) {
        const updated = { ...t.subtasks[idx]!, ...patch };
        t.subtasks[idx] = updated;
        writeDb(db);
        return updated;
      }
    }
    throw new Error('Subtask not found');
  },

  deleteSubtask(id: string): void {
    const db = readDb();
    for (const t of db.tasks) {
      t.subtasks = t.subtasks.filter((s) => s.id !== id);
    }
    writeDb(db);
  },
};

export const staticNotesStore = {
  listNotebooks(): Notebook[] {
    return [...readDb().notebooks];
  },

  createNotebook(name: string): Notebook {
    const db = readDb();
    const nb: Notebook = { id: makeId(), name, createdAt: new Date().toISOString() };
    db.notebooks.push(nb);
    writeDb(db);
    return nb;
  },

  deleteNotebook(id: string): void {
    const db = readDb();
    db.notebooks = db.notebooks.filter((n) => n.id !== id);
    db.plannerNotes = db.plannerNotes.map((n) =>
      n.notebookId === id ? { ...n, notebookId: null } : n
    );
    writeDb(db);
  },

  listTags(): NoteTag[] {
    const db = readDb();
    const set = new Set<string>();
    for (const n of db.plannerNotes) {
      for (const t of n.tags) set.add(t);
    }
    return Array.from(set)
      .sort()
      .map((name) => ({ id: name, name }));
  },

  listNotes(filters: { q?: string; notebookId?: string; courseId?: string; tag?: string } = {}): PlannerNote[] {
    const db = readDb();
    const q = filters.q?.trim().toLowerCase() ?? '';
    const tag = filters.tag?.trim().toLowerCase() ?? '';
    return db.plannerNotes
      .filter((n) => {
        if (filters.notebookId && n.notebookId !== filters.notebookId) return false;
        if (filters.courseId && n.courseId !== filters.courseId) return false;
        if (tag && !n.tags.includes(tag)) return false;
        if (q) {
          return (
            n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort(
        (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)
      );
  },

  createNote(payload: {
    title?: string;
    body?: string;
    notebookId?: string | null;
    courseId?: string | null;
    pinned?: boolean;
    tags?: string[];
  }): PlannerNote {
    const db = readDb();
    const now = new Date().toISOString();
    const body = payload.body ?? '';
    const note: PlannerNote = {
      id: makeId(),
      title: payload.title ?? 'Untitled note',
      body,
      content: body,
      notebookId: payload.notebookId ?? null,
      courseId: payload.courseId ?? null,
      pinned: payload.pinned ?? false,
      tags: Array.from(new Set((payload.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))),
      createdAt: now,
      updatedAt: now,
    };
    db.plannerNotes.unshift(note);
    writeDb(db);
    return note;
  },

  updateNote(
    id: string,
    patch: {
      title?: string;
      body?: string;
      notebookId?: string | null;
      courseId?: string | null;
      pinned?: boolean;
      tags?: string[];
    }
  ): PlannerNote {
    const db = readDb();
    const idx = db.plannerNotes.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error('Note not found');
    const existing = db.plannerNotes[idx]!;
    const body = patch.body ?? existing.body;
    const updated: PlannerNote = {
      ...existing,
      ...patch,
      body,
      content: body,
      tags:
        patch.tags !== undefined
          ? Array.from(new Set(patch.tags.map((t) => t.trim().toLowerCase()).filter(Boolean)))
          : existing.tags,
      updatedAt: new Date().toISOString(),
    };
    db.plannerNotes[idx] = updated;
    writeDb(db);
    return updated;
  },

  deleteNote(id: string): void {
    const db = readDb();
    db.plannerNotes = db.plannerNotes.filter((n) => n.id !== id);
    writeDb(db);
  },
};
