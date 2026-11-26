import { beforeEach, describe, expect, it } from 'vitest';
import { staticToolsStore, staticVocabStore } from './staticStore';

describe('staticStore fallback for GitHub Pages', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', {
      value: {
        localStorage: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => store.set(k, v),
          removeItem: (k: string) => store.delete(k),
        },
      },
      configurable: true,
    });
  });

  it('seeds Academic & GRE Core and runs SM-2 reviews in localStorage', () => {
    const decks = staticVocabStore.listDecks();
    expect(decks.length).toBe(1);
    expect(decks[0]?.totalCards).toBe(10);

    const queue = staticVocabStore.getReviewQueue(decks[0]?.id);
    expect(queue.length).toBe(10);

    const result = staticVocabStore.submitReview(queue[0]!.id, 3);
    expect(result.card.repetitions).toBe(1);
    expect(result.stats.learnedCount).toBe(1);
    expect(result.stats.dueToday).toBe(9);
  });

  it('persists todos, notes, and study sessions in static mode', () => {
    const todo = staticToolsStore.createTodo('Review notes');
    staticToolsStore.updateTodo(todo.id, { completed: true });
    expect(staticToolsStore.getTodosDay().todos[0]?.completed).toBe(true);

    staticToolsStore.logSession(30, 'manual');
    const summary = staticToolsStore.getAnalyticsSummary(7);
    expect(summary.todayMinutes).toBe(30);
    expect(summary.currentStreak).toBe(1);
  });
});
