export type ThemeId =
  | 'mild-blue'
  | 'sage'
  | 'dusk'
  | 'paper-light'
  | 'midnight'
  | 'lavender'
  | 'warm-sand'
  | 'ocean-teal'
  | 'rose-quartz'
  | 'auto';

export type AccentId =
  | 'default'
  | 'cobalt'
  | 'indigo'
  | 'emerald'
  | 'teal'
  | 'amber'
  | 'rose'
  | 'plum'
  | 'slate';

export type AnimationLevel = 'off' | 'low' | 'normal';

export type LocaleId = 'en' | 'vi';

export type BackgroundKind = 'gradient' | 'animated' | 'image' | 'video';

export type AnimatedBgId =
  | 'rain-glass'
  | 'aurora'
  | 'clouds'
  | 'starfield'
  | 'bokeh'
  | 'snowfall'
  | 'gradient-mesh';

export interface BackgroundConfig {
  kind: BackgroundKind;
  presetId: string;
  animatedId?: AnimatedBgId;
  animatedIntensity?: number;
  imageUrl: string;
  videoUrl: string;
  recentVideoSources?: string[];
  blurPx: number;
  dimPercent: number;
  brightnessPercent?: number;
  vignettePercent?: number;
  filmGrain?: boolean;
  autoRotateMinutes?: number;
}

export type WidgetId =
  | 'today'
  | 'clock'
  | 'pomodoro'
  | 'vocab'
  | 'timetable'
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
  height: number;
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
  NOTE_TEMPLATES,
  SAMPLE_COURSES,
  SAMPLE_DECK_CARDS,
  SAMPLE_DECK_DESCRIPTION,
  SAMPLE_DECK_NAME,
  SAMPLE_NOTES,
  SAMPLE_TASKS,
  SAMPLE_WEEKLY_EVENTS,
  type SeedCourseItem,
  type SeedEventItem,
  type SeedNoteItem,
  type SeedTaskItem,
  type SeedVocabItem,
} from './seedData.js';

export interface Course {
  id: string;
  name: string;
  code: string;
  color: string;
  instructor: string;
  room: string;
  createdAt: string;
  updatedAt: string;
}

export type TimetableEventType = 'class' | 'exam' | 'deadline' | 'personal';
export type TimetableRepeat = 'weekly' | 'none';

export interface TimetableEvent {
  id: string;
  courseId: string | null;
  title: string;
  type: TimetableEventType;
  dayOfWeek: number; // 0=Sun..6=Sat
  start: string; // HH:MM
  end: string; // HH:MM
  location: string;
  repeat: TimetableRepeat;
  date: string | null; // YYYY-MM-DD when repeat='none'
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface SemesterSettings {
  startDate: string;
  endDate: string;
  weekStart: 'mon' | 'sun';
  startHour: number;
  endHour: number;
  notifyMinutesBefore: number | null;
}

export interface ExpandedTimetableOccurrence {
  eventId: string;
  occurrenceKey: string;
  courseId: string | null;
  title: string;
  type: TimetableEventType;
  date: string;
  dayOfWeek: number;
  start: string;
  end: string;
  location: string;
  notes: string;
  repeat: TimetableRepeat;
  hasConflict: boolean;
}

export {
  detectEventConflicts,
  expandEvents,
  findConflictsForDraft,
  getDayOfWeekFromIso,
  getNextOrCurrentOccurrence,
  getWeekRangeIso,
  minutesToTime,
  parseIcs,
  serializeIcs,
  timeToMinutes,
  type NextUpInfo,
  type ParsedIcsEvent,
} from './timetable.js';

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

export interface Notebook {
  id: string;
  name: string;
  createdAt: string;
}

export interface NoteTag {
  id: string;
  name: string;
}

export interface PlannerNote {
  id: string;
  title: string;
  body: string;
  content: string;
  notebookId: string | null;
  courseId: string | null;
  pinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  date: string;
  durationMinutes: number;
  source: 'pomodoro' | 'manual';
  taskId?: string | null;
  completedAt: string;
}

export type TaskPriority = 'low' | 'med' | 'high';
export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskRepeat = 'none' | 'daily' | 'weekly';

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  sortOrder: number;
}

export interface PlannerTask {
  id: string;
  title: string;
  notes: string;
  dueDate: string | null;
  priority: TaskPriority;
  courseId: string | null;
  status: TaskStatus;
  repeat: TaskRepeat;
  sortOrder: number;
  createdAt: string;
  completedAt: string | null;
  subtasks: Subtask[];
}

export interface TaskUpdateResponse {
  task: PlannerTask;
  nextTask: PlannerTask | null;
}

export {
  filterTasks,
  getNextRecurringDueDate,
  parseQuickAdd,
  type ParsedQuickAdd,
  type TaskFilterOptions,
  type TaskViewMode,
} from './tasks.js';

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
