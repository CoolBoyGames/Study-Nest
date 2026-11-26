import { useEffect, useRef, useState } from 'react';
import { Bell, Clock } from 'lucide-react';
import {
  addDaysIso,
  expandEvents,
  getNextOrCurrentOccurrence,
  getTodayIsoDate,
  type Course,
  type SemesterSettings,
  type TimetableEvent,
} from '@studyspace/shared';

export interface NextUpBarProps {
  events: TimetableEvent[];
  courses: Course[];
  semester: SemesterSettings;
}

function formatCountdown(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function NextUpBar({ events, courses, semester }: NextUpBarProps) {
  const [now, setNow] = useState(() => new Date());
  const notifiedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const today = getTodayIsoDate(now);
  const upcoming = expandEvents(events, today, addDaysIso(today, 7), semester);
  const nextUp = getNextOrCurrentOccurrence(upcoming, now);

  // Optional browser notification N minutes before next class
  useEffect(() => {
    const lead = semester.notifyMinutesBefore;
    if (
      !nextUp ||
      nextUp.status !== 'next' ||
      lead === null ||
      lead <= 0 ||
      typeof Notification === 'undefined' ||
      Notification.permission !== 'granted'
    ) {
      return;
    }

    if (
      nextUp.minutesDelta <= lead &&
      nextUp.minutesDelta >= 0 &&
      !notifiedKeysRef.current.has(nextUp.occurrence.occurrenceKey)
    ) {
      notifiedKeysRef.current.add(nextUp.occurrence.occurrenceKey);
      new Notification(`Up next: ${nextUp.occurrence.title}`, {
        body: `Starts in ${nextUp.minutesDelta} min (${nextUp.occurrence.start})${
          nextUp.occurrence.location ? ` · ${nextUp.occurrence.location}` : ''
        }`,
      });
    }
  }, [nextUp, semester.notifyMinutesBefore]);

  if (!nextUp) {
    return (
      <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-muted)]">
        <Clock size={14} strokeWidth={1.5} />
        <span>No upcoming classes in the next 7 days.</span>
      </div>
    );
  }

  const course = nextUp.occurrence.courseId
    ? courses.find((c) => c.id === nextUp.occurrence.courseId)
    : undefined;

  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: course?.color ?? 'var(--primary)' }}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text)]">
            <span className="text-[var(--primary)]">
              {nextUp.status === 'current' ? 'Now:' : 'Next up:'}
            </span>
            <span className="truncate">{nextUp.occurrence.title}</span>
          </div>
          <div className="truncate text-[11px] text-[var(--text-muted)]">
            {nextUp.occurrence.date} · {nextUp.occurrence.start}–{nextUp.occurrence.end}
            {nextUp.occurrence.location ? ` · ${nextUp.occurrence.location}` : ''}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--surface-hover)] px-2.5 py-1 text-xs font-medium tabular-nums text-[var(--primary)]">
        {semester.notifyMinutesBefore ? <Bell size={12} strokeWidth={1.5} /> : null}
        <span>
          {nextUp.status === 'current'
            ? `${formatCountdown(nextUp.minutesDelta)} left`
            : `in ${formatCountdown(nextUp.minutesDelta)}`}
        </span>
      </div>
    </div>
  );
}
