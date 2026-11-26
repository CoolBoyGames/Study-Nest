import { describe, expect, it } from 'vitest';
import {
  detectEventConflicts,
  expandEvents,
  findConflictsForDraft,
  getNextOrCurrentOccurrence,
  parseIcs,
  serializeIcs,
} from './timetable.js';
import type { Course, TimetableEvent } from './index.js';

const SEMESTER = {
  startDate: '2026-09-01',
  endDate: '2026-12-20',
};

function makeEvent(overrides: Partial<TimetableEvent>): TimetableEvent {
  return {
    id: 'ev-1',
    courseId: null,
    title: 'Algorithms Lecture',
    type: 'class',
    dayOfWeek: 1, // Monday
    start: '09:00',
    end: '10:30',
    location: 'Hall A',
    repeat: 'weekly',
    date: null,
    notes: '',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

describe('timetable expandEvents, conflicts, and ICS', () => {
  it('expands weekly events within semester bounds and includes one-off events in range', () => {
    const events: TimetableEvent[] = [
      makeEvent({ id: 'weekly-mon', dayOfWeek: 1, start: '09:00', end: '10:30', repeat: 'weekly' }),
      makeEvent({
        id: 'exam-oneoff',
        title: 'Midterm',
        type: 'exam',
        dayOfWeek: 3,
        date: '2026-11-25',
        repeat: 'none',
        start: '14:00',
        end: '16:00',
      }),
      makeEvent({
        id: 'outside-oneoff',
        title: 'Winter Break',
        dayOfWeek: 5,
        date: '2026-12-25',
        repeat: 'none',
      }),
    ];

    // Week of Mon 2026-11-23 .. Sun 2026-11-29
    const occs = expandEvents(events, '2026-11-23', '2026-11-29', SEMESTER);
    expect(occs.map((o) => `${o.eventId}@${o.date}`)).toEqual([
      'weekly-mon@2026-11-23',
      'exam-oneoff@2026-11-25',
    ]);
  });

  it('clamps weekly recurring events to semester start and end dates', () => {
    const events = [makeEvent({ id: 'w1', dayOfWeek: 1, repeat: 'weekly' })];
    // Range spans past semester end 2026-12-20; Mon 2026-12-21 should NOT appear
    const occs = expandEvents(events, '2026-12-14', '2026-12-27', SEMESTER);
    expect(occs.map((o) => o.date)).toEqual(['2026-12-14']);
  });

  it('detects overlapping event conflicts and ignores back-to-back events', () => {
    const conflicts = detectEventConflicts([
      { occurrenceKey: 'a', date: '2026-11-23', start: '09:00', end: '10:30' },
      { occurrenceKey: 'b', date: '2026-11-23', start: '10:00', end: '11:00' },
      { occurrenceKey: 'c', date: '2026-11-23', start: '11:00', end: '12:00' },
    ]);
    expect(conflicts.has('a')).toBe(true);
    expect(conflicts.has('b')).toBe(true);
    expect(conflicts.has('c')).toBe(false);

    const existing = [
      makeEvent({ id: 'e1', dayOfWeek: 1, start: '09:00', end: '10:30', repeat: 'weekly' }),
    ];
    expect(
      findConflictsForDraft(
        { dayOfWeek: 1, date: null, repeat: 'weekly', start: '10:00', end: '11:00' },
        existing
      )
    ).toHaveLength(1);
    expect(
      findConflictsForDraft(
        { id: 'e1', dayOfWeek: 1, date: null, repeat: 'weekly', start: '10:00', end: '11:00' },
        existing
      )
    ).toHaveLength(0);
  });

  it('finds current or next class occurrence with minute delta', () => {
    const occs = expandEvents(
      [
        makeEvent({ id: 'm1', dayOfWeek: 4, start: '09:00', end: '10:30', repeat: 'weekly' }), // Thu 2026-11-26
        makeEvent({ id: 'm2', dayOfWeek: 4, start: '13:00', end: '14:00', repeat: 'weekly' }),
      ],
      '2026-11-26',
      '2026-11-28',
      SEMESTER
    );

    const during = getNextOrCurrentOccurrence(occs, new Date(2026, 10, 26, 9, 45));
    expect(during?.status).toBe('current');
    expect(during?.occurrence.eventId).toBe('m1');
    expect(during?.minutesDelta).toBe(45);

    const beforeNext = getNextOrCurrentOccurrence(occs, new Date(2026, 10, 26, 11, 0));
    expect(beforeNext?.status).toBe('next');
    expect(beforeNext?.occurrence.eventId).toBe('m2');
    expect(beforeNext?.minutesDelta).toBe(120);
  });

  it('round-trips events through ICS serialize and parse', () => {
    const courses: Course[] = [
      {
        id: 'c1',
        name: 'Linear Algebra',
        code: 'MATH 240',
        color: '#3A6BB5',
        instructor: 'Dr. Lin',
        room: 'Sci 204',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];
    const events = [
      makeEvent({
        id: 'ev-ics',
        courseId: 'c1',
        title: 'Lecture',
        dayOfWeek: 2,
        start: '10:00',
        end: '11:30',
        location: 'Sci 204',
        repeat: 'weekly',
      }),
    ];
    const ics = serializeIcs(events, courses, SEMESTER);
    expect(ics).toContain('RRULE:FREQ=WEEKLY');
    const parsed = parseIcs(ics);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.title).toBe('MATH 240: Lecture');
    expect(parsed[0]?.repeat).toBe('weekly');
    expect(parsed[0]?.start).toBe('10:00');
    expect(parsed[0]?.end).toBe('11:30');
  });
});
