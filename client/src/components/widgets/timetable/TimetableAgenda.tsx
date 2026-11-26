import { AlertTriangle, Calendar, CheckSquare, MapPin } from 'lucide-react';
import type { Course, ExpandedTimetableOccurrence, PlannerTask } from '@studyspace/shared';
import { EmptyState } from '../../ui';

export interface TimetableAgendaProps {
  occurrences: ExpandedTimetableOccurrence[];
  dueTasks?: PlannerTask[];
  courses: Course[];
  todayIso: string;
  onSelectOccurrence: (occ: ExpandedTimetableOccurrence) => void;
  onCreateNew: () => void;
}

function formatDayHeading(iso: string, todayIso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1));
  const label = dt.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return iso === todayIso ? `Today · ${label}` : label;
}

export function TimetableAgenda({
  occurrences,
  dueTasks = [],
  courses,
  todayIso,
  onSelectOccurrence,
  onCreateNew,
}: TimetableAgendaProps) {
  const openTasks = dueTasks.filter((t) => t.status !== 'done' && t.dueDate);
  if (occurrences.length === 0 && openTasks.length === 0) {
    return (
      <EmptyState
        icon={<Calendar size={22} strokeWidth={1.5} />}
        message="No scheduled events in this range."
        actionLabel="Add event"
        onAction={onCreateNew}
      />
    );
  }

  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const allDates = Array.from(
    new Set([...occurrences.map((o) => o.date), ...openTasks.map((t) => t.dueDate!)])
  ).sort();
  const grouped = new Map<string, ExpandedTimetableOccurrence[]>();
  for (const d of allDates) grouped.set(d, []);
  for (const occ of occurrences) {
    grouped.get(occ.date)?.push(occ);
  }

  return (
    <div className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
      {Array.from(grouped.entries()).map(([date, list]) => (
        <div key={date} className="flex flex-col gap-1.5">
          <h3
            className={`text-xs font-semibold uppercase tracking-wide ${
              date === todayIso ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
            }`}
          >
            {formatDayHeading(date, todayIso)}
          </h3>
          {list.map((occ) => {
            const course = occ.courseId ? courseMap.get(occ.courseId) : undefined;
            const accent = course?.color ?? 'var(--primary)';
            return (
              <button
                key={occ.occurrenceKey}
                type="button"
                onClick={() => onSelectOccurrence(occ)}
                style={{ borderLeftColor: accent }}
                className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-l-4 px-3 py-2 text-left transition-colors hover:bg-[var(--surface-hover)] ${
                  occ.hasConflict
                    ? 'border-[var(--warning)] bg-[var(--surface)]'
                    : 'border-[var(--border)] bg-[var(--surface)]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-[var(--text)]">
                      {occ.title}
                    </span>
                    {occ.hasConflict && (
                      <AlertTriangle
                        size={14}
                        strokeWidth={1.75}
                        className="shrink-0 text-[var(--warning)]"
                        aria-label="Time conflict"
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                    {course?.code && <span>{course.code}</span>}
                    {occ.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={11} strokeWidth={1.5} />
                        {occ.location}
                      </span>
                    )}
                  </div>
                </div>

                <span className="shrink-0 tabular-nums text-xs font-medium text-[var(--text-muted)]">
                  {occ.start} – {occ.end}
                </span>
              </button>
            );
          })}
          {openTasks
            .filter((t) => t.dueDate === date)
            .map((t) => (
              <div
                key={`task-${t.id}`}
                className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--border-control)] bg-[var(--surface)] px-3 py-1.5 text-xs"
              >
                <span className="flex items-center gap-1.5 font-medium text-[var(--text)]">
                  <CheckSquare size={13} strokeWidth={1.5} className="text-[var(--primary)]" />
                  {t.title}
                </span>
                <span className="uppercase text-[10px] text-[var(--text-muted)]">Task due</span>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
