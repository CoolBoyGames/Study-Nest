import { addDaysIso } from './srs.js';
import { getDayOfWeekFromIso } from './timetable.js';
import type {
  Course,
  PlannerTask,
  TaskPriority,
  TaskRepeat,
} from './index.js';

export interface ParsedQuickAdd {
  title: string;
  priority: TaskPriority;
  courseId: string | null;
  dueDate: string | null;
  repeat: TaskRepeat;
}

const WEEKDAY_MAP: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

function nextWeekdayIso(todayIso: string, targetDow: number): string {
  const currentDow = getDayOfWeekFromIso(todayIso);
  let delta = (targetDow - currentDow + 7) % 7;
  if (delta === 0) delta = 7;
  return addDaysIso(todayIso, delta);
}

/**
 * Pure parser for inline quick-add syntax:
 * e.g. "Essay !high #cs201 tomorrow weekly"
 */
export function parseQuickAdd(
  rawInput: string,
  courses: Course[],
  todayIso: string
): ParsedQuickAdd {
  let priority: TaskPriority = 'med';
  let courseId: string | null = null;
  let dueDate: string | null = null;
  let repeat: TaskRepeat = 'none';

  const tokens = rawInput.trim().split(/\s+/).filter(Boolean);
  const kept: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!;
    const lower = tok.toLowerCase();

    // Priority: !high, !med, !medium, !low
    if (lower === '!high' || lower === '!h') {
      priority = 'high';
      continue;
    }
    if (lower === '!med' || lower === '!medium' || lower === '!m') {
      priority = 'med';
      continue;
    }
    if (lower === '!low' || lower === '!l') {
      priority = 'low';
      continue;
    }

    // Course tag: #cs201 or #math or #courseName
    if (lower.startsWith('#') && lower.length > 1) {
      const needle = lower.slice(1).replace(/[^a-z0-9]/g, '');
      const match = courses.find((c) => {
        const normCode = c.code.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normName = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return (
          (normCode && (normCode === needle || normCode.startsWith(needle))) ||
          normName.includes(needle)
        );
      });
      if (match) {
        courseId = match.id;
        continue;
      }
    }

    // Repeat keywords
    if (lower === 'daily' || lower === '@daily') {
      repeat = 'daily';
      continue;
    }
    if (lower === 'weekly' || lower === '@weekly') {
      repeat = 'weekly';
      continue;
    }

    // Due date keywords
    if (lower === 'today') {
      dueDate = todayIso;
      continue;
    }
    if (lower === 'tomorrow' || lower === 'tmr') {
      dueDate = addDaysIso(todayIso, 1);
      continue;
    }
    if (lower === 'next' && tokens[i + 1]?.toLowerCase() === 'week') {
      dueDate = addDaysIso(todayIso, 7);
      i++;
      continue;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(lower)) {
      dueDate = lower;
      continue;
    }
    if (WEEKDAY_MAP[lower] !== undefined) {
      dueDate = nextWeekdayIso(todayIso, WEEKDAY_MAP[lower]!);
      continue;
    }

    kept.push(tok);
  }

  return {
    title: kept.join(' ').trim() || rawInput.trim(),
    priority,
    courseId,
    dueDate,
    repeat,
  };
}

export function getNextRecurringDueDate(
  currentDueDate: string | null,
  repeat: TaskRepeat,
  todayIso: string
): string | null {
  if (repeat === 'none') return null;
  const base = currentDueDate && currentDueDate >= todayIso ? currentDueDate : todayIso;
  return repeat === 'daily' ? addDaysIso(base, 1) : addDaysIso(base, 7);
}

export type TaskViewMode = 'today' | 'upcoming' | 'overdue' | 'done' | 'course';

export interface TaskFilterOptions {
  search?: string;
  priority?: 'all' | TaskPriority;
  courseId?: string; // 'all' | 'none' | <courseId>
}

export function filterTasks(
  tasks: PlannerTask[],
  view: TaskViewMode,
  options: TaskFilterOptions,
  todayIso: string
): PlannerTask[] {
  const search = options.search?.trim().toLowerCase() ?? '';
  const priority = options.priority ?? 'all';
  const courseId = options.courseId ?? 'all';

  return tasks.filter((t) => {
    if (view === 'done') {
      if (t.status !== 'done') return false;
    } else {
      if (t.status === 'done') return false;
      if (view === 'today') {
        if (t.dueDate !== todayIso) return false;
      } else if (view === 'upcoming') {
        if (!t.dueDate || t.dueDate <= todayIso) return false;
      } else if (view === 'overdue') {
        if (!t.dueDate || t.dueDate >= todayIso) return false;
      }
    }

    if (priority !== 'all' && t.priority !== priority) return false;

    if (courseId === 'none') {
      if (t.courseId !== null) return false;
    } else if (courseId !== 'all' && t.courseId !== courseId) {
      return false;
    }

    if (search) {
      const inTitle = t.title.toLowerCase().includes(search);
      const inNotes = t.notes.toLowerCase().includes(search);
      const inSubtasks = t.subtasks.some((s) => s.title.toLowerCase().includes(search));
      if (!inTitle && !inNotes && !inSubtasks) return false;
    }

    return true;
  });
}
