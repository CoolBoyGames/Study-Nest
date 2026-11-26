import { describe, expect, it } from 'vitest';
import { addDaysIso, previewSm2Intervals, scheduleSm2 } from './srs.js';

describe('SM-2 spaced repetition scheduler', () => {
  const baseCard = { repetitions: 0, intervalDays: 0, easeFactor: 2.5 };

  it('schedules a new card on Good (3) -> 1d, then 6d, then ease-multiplied', () => {
    const first = scheduleSm2(baseCard, 3, '2026-11-26');
    expect(first.repetitions).toBe(1);
    expect(first.intervalDays).toBe(1);
    expect(first.dueDate).toBe('2026-11-27');

    const second = scheduleSm2(first, 3, '2026-11-27');
    expect(second.repetitions).toBe(2);
    expect(second.intervalDays).toBe(6);
    expect(second.dueDate).toBe('2026-12-03');

    const third = scheduleSm2(second, 3, '2026-12-03');
    expect(third.repetitions).toBe(3);
    expect(third.intervalDays).toBe(Math.round(6 * second.easeFactor));
  });

  it('resets repetitions to 0 and interval to 1d on Again (1)', () => {
    const mature = { repetitions: 4, intervalDays: 24, easeFactor: 2.5 };
    const lapsed = scheduleSm2(mature, 1, '2026-11-26');
    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.intervalDays).toBe(1);
    expect(lapsed.dueDate).toBe('2026-11-27');
    expect(lapsed.easeFactor).toBeLessThan(2.5);
    expect(lapsed.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('never drops easeFactor below 1.3', () => {
    let state = { repetitions: 2, intervalDays: 6, easeFactor: 1.35 };
    for (let i = 0; i < 6; i++) {
      state = scheduleSm2(state, 1, '2026-11-26');
    }
    expect(state.easeFactor).toBe(1.3);
  });

  it('increases interval faster for Easy (4) than Hard (2)', () => {
    const mature = { repetitions: 2, intervalDays: 10, easeFactor: 2.5 };
    const hard = scheduleSm2(mature, 2, '2026-11-26');
    const good = scheduleSm2(mature, 3, '2026-11-26');
    const easy = scheduleSm2(mature, 4, '2026-11-26');

    expect(hard.intervalDays).toBeLessThan(good.intervalDays);
    expect(good.intervalDays).toBeLessThan(easy.intervalDays);
  });

  it('computes interval previews for all 4 ratings and handles month boundaries', () => {
    expect(addDaysIso('2026-11-29', 4)).toBe('2026-12-03');
    const previews = previewSm2Intervals(baseCard, '2026-11-26');
    expect(previews).toEqual({
      1: 1,
      2: 1,
      3: 1,
      4: 4,
    });
  });
});
