import { addDaysIso } from './srs.js';
import type {
  Course,
  ExpandedTimetableOccurrence,
  SemesterSettings,
  TimetableEvent,
  TimetableEventType,
} from './index.js';

export function timeToMinutes(hhmm: string): number {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return Math.min(24 * 60, Math.max(0, h * 60 + m));
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.min(24 * 60 - 1, Math.max(0, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getDayOfWeekFromIso(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1));
  return dt.getUTCDay(); // 0=Sun..6=Sat
}

export function getWeekRangeIso(anchorIsoDate: string, weekStart: 'mon' | 'sun'): {
  startIso: string;
  endIso: string;
  dates: string[];
} {
  const dow = getDayOfWeekFromIso(anchorIsoDate);
  const offset = weekStart === 'mon' ? (dow === 0 ? -6 : 1 - dow) : -dow;
  const startIso = addDaysIso(anchorIsoDate, offset);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDaysIso(startIso, i));
  }
  return {
    startIso,
    endIso: dates[6] ?? startIso,
    dates,
  };
}

/**
 * Pure function expanding weekly recurring and one-off timetable events
 * across [rangeStartIso, rangeEndIso], clamped to [semester.startDate, semester.endDate]
 * for weekly recurring events, and annotating overlapping time conflicts.
 */
export function expandEvents(
  events: TimetableEvent[],
  rangeStartIso: string,
  rangeEndIso: string,
  semester: Pick<SemesterSettings, 'startDate' | 'endDate'>
): ExpandedTimetableOccurrence[] {
  if (rangeStartIso > rangeEndIso) return [];

  const occurrences: ExpandedTimetableOccurrence[] = [];
  const weeklyStart = rangeStartIso > semester.startDate ? rangeStartIso : semester.startDate;
  const weeklyEnd = rangeEndIso < semester.endDate ? rangeEndIso : semester.endDate;

  for (const ev of events) {
    if (ev.repeat === 'none') {
      if (ev.date && ev.date >= rangeStartIso && ev.date <= rangeEndIso) {
        occurrences.push({
          eventId: ev.id,
          occurrenceKey: `${ev.id}:${ev.date}`,
          courseId: ev.courseId,
          title: ev.title,
          type: ev.type,
          date: ev.date,
          dayOfWeek: getDayOfWeekFromIso(ev.date),
          start: ev.start,
          end: ev.end,
          location: ev.location,
          notes: ev.notes,
          repeat: ev.repeat,
          hasConflict: false,
        });
      }
      continue;
    }

    if (weeklyStart > weeklyEnd) continue;

    let cursor = weeklyStart;
    while (cursor <= weeklyEnd) {
      const dow = getDayOfWeekFromIso(cursor);
      if (dow === ev.dayOfWeek) {
        occurrences.push({
          eventId: ev.id,
          occurrenceKey: `${ev.id}:${cursor}`,
          courseId: ev.courseId,
          title: ev.title,
          type: ev.type,
          date: cursor,
          dayOfWeek: dow,
          start: ev.start,
          end: ev.end,
          location: ev.location,
          notes: ev.notes,
          repeat: ev.repeat,
          hasConflict: false,
        });
      }
      cursor = addDaysIso(cursor, 1);
    }
  }

  occurrences.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      timeToMinutes(a.start) - timeToMinutes(b.start) ||
      timeToMinutes(a.end) - timeToMinutes(b.end)
  );

  const conflicts = detectEventConflicts(occurrences);
  return occurrences.map((occ) => ({
    ...occ,
    hasConflict: conflicts.has(occ.occurrenceKey),
  }));
}

export function detectEventConflicts(
  occurrences: Array<
    Pick<ExpandedTimetableOccurrence, 'occurrenceKey' | 'date' | 'start' | 'end'>
  >
): Set<string> {
  const conflicting = new Set<string>();
  const byDate = new Map<
    string,
    Array<{ occurrenceKey: string; startMin: number; endMin: number }>
  >();

  for (const occ of occurrences) {
    const startMin = timeToMinutes(occ.start);
    const endMin = timeToMinutes(occ.end);
    const list = byDate.get(occ.date) ?? [];
    list.push({ occurrenceKey: occ.occurrenceKey, startMin, endMin });
    byDate.set(occ.date, list);
  }

  for (const dayList of byDate.values()) {
    dayList.sort((a, b) => a.startMin - b.startMin);
    for (let i = 0; i < dayList.length; i++) {
      const a = dayList[i]!;
      for (let j = i + 1; j < dayList.length; j++) {
        const b = dayList[j]!;
        if (b.startMin >= a.endMin) break;
        if (a.startMin < b.endMin && b.startMin < a.endMin) {
          conflicting.add(a.occurrenceKey);
          conflicting.add(b.occurrenceKey);
        }
      }
    }
  }

  return conflicting;
}

export function findConflictsForDraft(
  candidate: {
    id?: string;
    dayOfWeek: number;
    date: string | null;
    repeat: 'weekly' | 'none';
    start: string;
    end: string;
  },
  existingEvents: TimetableEvent[]
): TimetableEvent[] {
  const candStart = timeToMinutes(candidate.start);
  const candEnd = timeToMinutes(candidate.end);
  if (candEnd <= candStart) return [];

  return existingEvents.filter((ev) => {
    if (candidate.id && ev.id === candidate.id) return false;
    const evStart = timeToMinutes(ev.start);
    const evEnd = timeToMinutes(ev.end);
    if (!(candStart < evEnd && evStart < candEnd)) return false;

    if (candidate.repeat === 'none' && ev.repeat === 'none') {
      return candidate.date === ev.date;
    }
    if (candidate.repeat === 'none' && ev.repeat === 'weekly') {
      return candidate.date ? getDayOfWeekFromIso(candidate.date) === ev.dayOfWeek : false;
    }
    if (candidate.repeat === 'weekly' && ev.repeat === 'none') {
      return ev.date ? getDayOfWeekFromIso(ev.date) === candidate.dayOfWeek : false;
    }
    return candidate.dayOfWeek === ev.dayOfWeek;
  });
}

export interface NextUpInfo {
  status: 'current' | 'next';
  occurrence: ExpandedTimetableOccurrence;
  minutesDelta: number;
}

export function getNextOrCurrentOccurrence(
  occurrences: ExpandedTimetableOccurrence[],
  now: Date = new Date()
): NextUpInfo | null {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayIso = `${y}-${m}-${d}`;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const occ of occurrences) {
    if (occ.date < todayIso) continue;
    const startMin = timeToMinutes(occ.start);
    const endMin = timeToMinutes(occ.end);

    if (occ.date === todayIso) {
      if (nowMinutes >= startMin && nowMinutes < endMin) {
        return {
          status: 'current',
          occurrence: occ,
          minutesDelta: endMin - nowMinutes,
        };
      }
      if (startMin > nowMinutes) {
        return {
          status: 'next',
          occurrence: occ,
          minutesDelta: startMin - nowMinutes,
        };
      }
    } else {
      const daysDiff = Math.round(
        (Date.UTC(
          Number(occ.date.slice(0, 4)),
          Number(occ.date.slice(5, 7)) - 1,
          Number(occ.date.slice(8, 10))
        ) -
          Date.UTC(y, now.getMonth(), now.getDate())) /
          86_400_000
      );
      return {
        status: 'next',
        occurrence: occ,
        minutesDelta: daysDiff * 1440 + startMin - nowMinutes,
      };
    }
  }

  return null;
}

export interface ParsedIcsEvent {
  title: string;
  type: TimetableEventType;
  dayOfWeek: number;
  start: string;
  end: string;
  location: string;
  repeat: 'weekly' | 'none';
  date: string | null;
  notes: string;
}

function parseIcsDateTime(raw: string): { date: string; time: string } | null {
  const cleaned = raw.trim().replace(/^.*:/, '');
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/.exec(cleaned);
  if (!match) return null;
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const time = match[4] && match[5] ? `${match[4]}:${match[5]}` : '09:00';
  return { date, time };
}

export function parseIcs(icsText: string): ParsedIcsEvent[] {
  const unfolded = icsText.replace(/\r\n[ \t]/g, '').replace(/\r/g, '');
  const blocks = unfolded.split('BEGIN:VEVENT').slice(1);
  const parsed: ParsedIcsEvent[] = [];

  for (const block of blocks) {
    const body = block.split('END:VEVENT')[0] ?? '';
    const lines = body.split('\n').map((l) => l.trim());
    const map = new Map<string, string>();
    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const keyPart = line.slice(0, colonIdx).split(';')[0]?.toUpperCase() ?? '';
      const val = line.slice(colonIdx + 1).replace(/\\n/g, '\n').replace(/\\,/g, ',');
      map.set(keyPart, val);
    }

    const summary = map.get('SUMMARY')?.trim();
    const dtStart = map.get('DTSTART');
    if (!summary || !dtStart) continue;

    const startParsed = parseIcsDateTime(dtStart);
    if (!startParsed) continue;

    const dtEnd = map.get('DTEND');
    const endParsed = dtEnd ? parseIcsDateTime(dtEnd) : null;
    const endTime =
      endParsed && timeToMinutes(endParsed.time) > timeToMinutes(startParsed.time)
        ? endParsed.time
        : minutesToTime(timeToMinutes(startParsed.time) + 60);

    const rrule = map.get('RRULE') ?? '';
    const isWeekly = rrule.toUpperCase().includes('FREQ=WEEKLY');
    const dow = getDayOfWeekFromIso(startParsed.date);

    parsed.push({
      title: summary,
      type: 'class',
      dayOfWeek: dow,
      start: startParsed.time,
      end: endTime,
      location: map.get('LOCATION')?.trim() ?? '',
      repeat: isWeekly ? 'weekly' : 'none',
      date: isWeekly ? null : startParsed.date,
      notes: map.get('DESCRIPTION')?.trim() ?? '',
    });
  }

  return parsed;
}

function escapeIcsText(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function serializeIcs(
  events: TimetableEvent[],
  courses: Course[],
  semester: Pick<SemesterSettings, 'startDate' | 'endDate'>
): string {
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StudyNest//Timetable//EN',
    'CALSCALE:GREGORIAN',
  ];

  for (const ev of events) {
    let firstDate = ev.date ?? semester.startDate;
    if (ev.repeat === 'weekly') {
      let cur = semester.startDate;
      for (let i = 0; i < 7; i++) {
        if (getDayOfWeekFromIso(cur) === ev.dayOfWeek) {
          firstDate = cur;
          break;
        }
        cur = addDaysIso(cur, 1);
      }
    }

    const dCompact = firstDate.replace(/-/g, '');
    const startCompact = ev.start.replace(':', '') + '00';
    const endCompact = ev.end.replace(':', '') + '00';
    const course = ev.courseId ? courseMap.get(ev.courseId) : undefined;
    const summary = course?.code ? `${course.code}: ${ev.title}` : ev.title;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@studynest`);
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);
    lines.push(`DTSTART:${dCompact}T${startCompact}`);
    lines.push(`DTEND:${dCompact}T${endCompact}`);
    if (ev.location) lines.push(`LOCATION:${escapeIcsText(ev.location)}`);
    if (ev.notes) lines.push(`DESCRIPTION:${escapeIcsText(ev.notes)}`);
    if (ev.repeat === 'weekly') {
      const untilCompact = semester.endDate.replace(/-/g, '') + 'T235959';
      lines.push(`RRULE:FREQ=WEEKLY;UNTIL=${untilCompact}`);
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
