export type ThemeId = 'mild-blue' | 'sage' | 'dusk' | 'paper-light' | 'midnight';

export type BackgroundKind = 'gradient' | 'image' | 'video';

export interface BackgroundConfig {
  kind: BackgroundKind;
  presetId: string;
  imageUrl: string;
  videoUrl: string;
  blurPx: number;
  dimPercent: number;
}

export type WidgetId =
  | 'clock'
  | 'pomodoro'
  | 'vocab'
  | 'todos'
  | 'notes'
  | 'analytics'
  | 'spotify'
  | 'ambient'
  | 'appearance';

export interface WidgetLayout {
  id: WidgetId;
  visible: boolean;
  minimized: boolean;
  x: number;
  y: number;
  width: number;
  zIndex: number;
}

export interface ClockSettings {
  mode: 'digital' | 'analog';
  hourFormat: '12h' | '24h';
  showDate: boolean;
}

export type PomodoroPhase = 'focus' | 'short-break' | 'long-break';

export interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLongBreak: number;
  autoCycle: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export type AmbientChannelId = 'rain' | 'cafe' | 'white-noise';

export interface AmbientChannelState {
  playing: boolean;
  volume: number; // 0 to 1
}

export type AmbientSettings = Record<AmbientChannelId, AmbientChannelState>;

export interface ApiHealthResponse {
  status: 'ok';
  timestamp: string;
  database: 'connected';
}

export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}

// Phase 2 & 3 shared domain models (matching SQLite schema)
export interface Deck {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeckWithCounts extends Deck {
  totalCards: number;
  dueCount: number;
  newCount: number;
  learnedCount: number;
}

export type ReviewRating = 1 | 2 | 3 | 4; // 1=Again, 2=Hard, 3=Good, 4=Easy

export type IntervalPreviews = Record<ReviewRating, number>;

export interface VocabCard {
  id: string;
  deckId: string;
  word: string;
  meaning: string;
  partOfSpeech: string;
  example: string;
  notes: string;
  tags: string[];
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  dueDate: string;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VocabCardWithPreviews extends VocabCard {
  previews: IntervalPreviews;
}

export interface SrsStats {
  dueToday: number;
  newCount: number;
  learnedCount: number;
  totalCards: number;
  retentionRate: number;
  reviewStreak: number;
  reviewedToday: number;
}

export interface ReviewSubmissionResponse {
  card: VocabCard;
  stats: SrsStats;
}

export interface ImportCardsResponse {
  imported: number;
  skipped: number;
}

export {
  addDaysIso,
  getTodayIsoDate,
  previewSm2Intervals,
  scheduleSm2,
  type Sm2Result,
  type Sm2State,
} from './srs.js';

export { parseCardsCsv, serializeCardsCsv, type CsvCardRow } from './csv.js';

export {
  SAMPLE_DECK_CARDS,
  SAMPLE_DECK_DESCRIPTION,
  SAMPLE_DECK_NAME,
  type SeedVocabItem,
} from './seedData.js';

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyGoal {
  date: string;
  targetMinutes: number;
  targetTasks: number;
  updatedAt: string;
}

export interface ScratchpadNote {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  date: string;
  durationMinutes: number;
  source: 'pomodoro' | 'manual';
  completedAt: string;
}

export interface TodosDayResponse {
  date: string;
  todos: TodoItem[];
  goal: DailyGoal;
}

export interface DailyFocusPoint {
  date: string;
  minutes: number;
  sessions: number;
}

export interface AnalyticsSummary {
  todayMinutes: number;
  totalMinutes: number;
  totalSessions: number;
  currentStreak: number;
  longestStreak: number;
  dailyGoalMinutes: number;
  days: DailyFocusPoint[];
}
