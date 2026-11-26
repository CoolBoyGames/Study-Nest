import type { IntervalPreviews, ReviewRating } from './index.js';

export interface Sm2State {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
}

export interface Sm2Result extends Sm2State {
  dueDate: string;
}

export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function getTodayIsoDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Pure SM-2 spaced repetition scheduler supporting 4-point rating:
 * 1 = Again, 2 = Hard, 3 = Good, 4 = Easy.
 */
export function scheduleSm2(
  state: Sm2State,
  rating: ReviewRating,
  todayIsoDate: string = getTodayIsoDate()
): Sm2Result {
  const prevRep = Math.max(0, state.repetitions);
  const prevInterval = Math.max(0, state.intervalDays);
  const prevEase = Math.max(1.3, state.easeFactor);

  // Map 4-button UX ratings to SM-2 quality (0..5)
  const qualityMap: Record<ReviewRating, number> = {
    1: 1, // Again (lapse)
    2: 3, // Hard
    3: 4, // Good
    4: 5, // Easy
  };
  const q = qualityMap[rating];

  let repetitions: number;
  let intervalDays: number;

  if (rating === 1) {
    repetitions = 0;
    intervalDays = 1;
  } else if (rating === 2) {
    if (prevRep === 0) {
      repetitions = 1;
      intervalDays = 1;
    } else if (prevRep === 1) {
      repetitions = 2;
      intervalDays = 3;
    } else {
      repetitions = prevRep + 1;
      intervalDays = Math.max(1, Math.round(prevInterval * 1.2));
    }
  } else if (rating === 3) {
    if (prevRep === 0) {
      repetitions = 1;
      intervalDays = 1;
    } else if (prevRep === 1) {
      repetitions = 2;
      intervalDays = 6;
    } else {
      repetitions = prevRep + 1;
      intervalDays = Math.max(1, Math.round(prevInterval * prevEase));
    }
  } else {
    // rating === 4 (Easy)
    if (prevRep === 0) {
      repetitions = 1;
      intervalDays = 4;
    } else if (prevRep === 1) {
      repetitions = 2;
      intervalDays = 8;
    } else {
      repetitions = prevRep + 1;
      intervalDays = Math.max(1, Math.round(prevInterval * prevEase * 1.3));
    }
  }

  const rawEase = prevEase + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  const easeFactor = Math.max(1.3, Number(rawEase.toFixed(2)));
  const dueDate = addDaysIso(todayIsoDate, intervalDays);

  return {
    repetitions,
    intervalDays,
    easeFactor,
    dueDate,
  };
}

export function previewSm2Intervals(
  state: Sm2State,
  todayIsoDate: string = getTodayIsoDate()
): IntervalPreviews {
  return {
    1: scheduleSm2(state, 1, todayIsoDate).intervalDays,
    2: scheduleSm2(state, 2, todayIsoDate).intervalDays,
    3: scheduleSm2(state, 3, todayIsoDate).intervalDays,
    4: scheduleSm2(state, 4, todayIsoDate).intervalDays,
  };
}
