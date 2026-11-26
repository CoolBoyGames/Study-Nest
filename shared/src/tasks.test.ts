import { describe, expect, it } from 'vitest';
import { filterTasks, getNextRecurringDueDate, parseQuickAdd } from './tasks.js';
import type { Course, PlannerTask } from './index.js';

const COURSES: Course[] = [
  {
    id: 'c-cs',
    name: 'Data Structures & Algorithms',
    code: 'CS 201',
    color: '#3A6BB5',
    instructor: 'Prof. Vance',
    room: 'Gates 104',
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01',
  },
  {
    id: 'c-eng',
    name: 'Academic Writing Seminar',
    code: 'ENG 115',
    color: '#A36818',
    instructor: 'Dr. Hughes',
    room: 'Hum 302',
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01',
  },
];

function makeTask(overrides: Partial<PlannerTask>): PlannerTask {
  return {
    id: 't1',
    title: 'Sample task',
    notes: '',
    dueDate: '2026-11-26',
    priority: 'med',
    courseId: null,
    status: 'todo',
    repeat: 'none',
    sortOrder: 0,
    createdAt: '2026-11-20T00:00:00Z',
    completedAt: null,
    subtasks: [],
    ...overrides,
  };
}

describe('parseQuickAdd, recurring due dates, and task filters', () => {
  it('parses priority, course tag, due date, and repeat syntax cleanly', () => {
    const parsed = parseQuickAdd('Essay draft !high #eng115 tomorrow', COURSES, '2026-11-26');
    expect(parsed).toEqual({
      title: 'Essay draft',
      priority: 'high',
      courseId: 'c-eng',
      dueDate: '2026-11-27',
      repeat: 'none',
    });

    const recurring = parseQuickAdd('Leetcode practice !low #cs daily today', COURSES, '2026-11-26');
    expect(recurring).toEqual({
      title: 'Leetcode practice',
      priority: 'low',
      courseId: 'c-cs',
      dueDate: '2026-11-26',
      repeat: 'daily',
    });
  });

  it('computes next due dates for daily and weekly recurring tasks', () => {
    expect(getNextRecurringDueDate('2026-11-26', 'daily', '2026-11-26')).toBe('2026-11-27');
    expect(getNextRecurringDueDate('2026-11-26', 'weekly', '2026-11-26')).toBe('2026-12-03');
    expect(getNextRecurringDueDate('2026-11-20', 'daily', '2026-11-26')).toBe('2026-11-27');
    expect(getNextRecurringDueDate('2026-11-26', 'none', '2026-11-26')).toBeNull();
  });

  it('filters tasks by view (today/upcoming/overdue/done/course), priority, course, and search', () => {
    const tasks: PlannerTask[] = [
      makeTask({ id: 'today-hi', title: 'Lab report', dueDate: '2026-11-26', priority: 'high', courseId: 'c-cs' }),
      makeTask({ id: 'over', title: 'Reading', dueDate: '2026-11-24', priority: 'low', courseId: 'c-eng' }),
      makeTask({ id: 'up', title: 'Exam prep', dueDate: '2026-11-29', priority: 'high', courseId: 'c-cs' }),
      makeTask({ id: 'done', title: 'Submitted quiz', dueDate: '2026-11-26', status: 'done', courseId: 'c-cs' }),
    ];

    expect(filterTasks(tasks, 'today', {}, '2026-11-26').map((t) => t.id)).toEqual(['today-hi']);
    expect(filterTasks(tasks, 'overdue', {}, '2026-11-26').map((t) => t.id)).toEqual(['over']);
    expect(filterTasks(tasks, 'upcoming', {}, '2026-11-26').map((t) => t.id)).toEqual(['up']);
    expect(filterTasks(tasks, 'done', {}, '2026-11-26').map((t) => t.id)).toEqual(['done']);
    expect(
      filterTasks(tasks, 'course', { priority: 'high', courseId: 'c-cs', search: 'prep' }, '2026-11-26').map(
        (t) => t.id
      )
    ).toEqual(['up']);
  });
});
