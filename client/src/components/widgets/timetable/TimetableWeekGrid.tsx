import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  getDayOfWeekFromIso,
  minutesToTime,
  timeToMinutes,
  type Course,
  type ExpandedTimetableOccurrence,
  type PlannerTask,
  type SemesterSettings,
} from '@studyspace/shared';

const ROW_HEIGHT = 44; // px per hour

export interface TimetableWeekGridProps {
  dates: string[]; // 7 days (week) or 1 day (day view)
  occurrences: ExpandedTimetableOccurrence[];
  dueTasks?: PlannerTask[];
  courses: Course[];
  semester: SemesterSettings;
  todayIso: string;
  onCreateSlot: (dateIso: string, start: string, end: string) => void;
  onSelectOccurrence: (occ: ExpandedTimetableOccurrence) => void;
  onMoveOrResizeEvent: (
    eventId: string,
    patch: { dayOfWeek: number; date: string | null; start: string; end: string }
  ) => void;
}

function snapMinutes15(mins: number): number {
  return Math.round(mins / 15) * 15;
}

function formatDayShort(iso: string): { weekday: string; dayNum: string } {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1));
  return {
    weekday: dt.toLocaleDateString([], { weekday: 'short', timeZone: 'UTC' }),
    dayNum: String(d ?? ''),
  };
}

export function TimetableWeekGrid({
  dates,
  occurrences,
  dueTasks = [],
  courses,
  semester,
  todayIso,
  onCreateSlot,
  onSelectOccurrence,
  onMoveOrResizeEvent,
}: TimetableWeekGridProps) {
  const startHour = Math.min(20, Math.max(0, semester.startHour));
  const endHour = Math.min(24, Math.max(startHour + 2, semester.endHour));
  const totalHours = endHour - startHour;
  const startMinuteOffset = startHour * 60;
  const endMinuteOffset = endHour * 60;
  const hours = Array.from({ length: totalHours }, (_, i) => startHour + i);

  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const gridBodyRef = useRef<HTMLDivElement>(null);

  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  useEffect(() => {
    const t = window.setInterval(() => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => window.clearInterval(t);
  }, []);

  // Drag-create on empty column
  const [creating, setCreating] = useState<{
    dayIdx: number;
    anchorMin: number;
    currentMin: number;
  } | null>(null);

  // Move or resize existing event
  const [draggingEv, setDraggingEv] = useState<{
    occ: ExpandedTimetableOccurrence;
    mode: 'move' | 'resize';
    startY: number;
    startX: number;
    origStartMin: number;
    origEndMin: number;
    origDayIdx: number;
    previewStartMin: number;
    previewEndMin: number;
    previewDayIdx: number;
  } | null>(null);

  // Keyboard grid focus (dayIdx, hourOffset)
  const [focusedCell, setFocusedCell] = useState<{ dayIdx: number; hourIdx: number }>({
    dayIdx: 0,
    hourIdx: 0,
  });

  const yToMinutes = (clientY: number): number => {
    const rect = gridBodyRef.current?.getBoundingClientRect();
    if (!rect) return startMinuteOffset;
    const relY = Math.min(rect.height, Math.max(0, clientY - rect.top));
    const raw = startMinuteOffset + (relY / ROW_HEIGHT) * 60;
    return Math.min(endMinuteOffset, Math.max(startMinuteOffset, snapMinutes15(raw)));
  };

  const handleColumnPointerDown = (dayIdx: number, e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-event-block="true"]')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const min = yToMinutes(e.clientY);
    setCreating({ dayIdx, anchorMin: min, currentMin: min + 60 });
  };

  const handleColumnPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!creating) return;
    const min = yToMinutes(e.clientY);
    setCreating((prev) => (prev ? { ...prev, currentMin: min } : null));
  };

  const handleColumnPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!creating) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const minStart = Math.min(creating.anchorMin, creating.currentMin);
    const minEnd = Math.max(creating.anchorMin, creating.currentMin);
    const safeEnd = Math.min(
      endMinuteOffset,
      minEnd - minStart >= 30 ? minEnd : minStart + 60
    );
    const dateIso = dates[creating.dayIdx] ?? todayIso;
    setCreating(null);
    if (safeEnd > minStart) {
      onCreateSlot(dateIso, minutesToTime(minStart), minutesToTime(safeEnd));
    }
  };

  const handleEventPointerDown = (
    occ: ExpandedTimetableOccurrence,
    dayIdx: number,
    mode: 'move' | 'resize',
    e: React.PointerEvent<HTMLElement>
  ) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const origStartMin = timeToMinutes(occ.start);
    const origEndMin = timeToMinutes(occ.end);
    setDraggingEv({
      occ,
      mode,
      startY: e.clientY,
      startX: e.clientX,
      origStartMin,
      origEndMin,
      origDayIdx: dayIdx,
      previewStartMin: origStartMin,
      previewEndMin: origEndMin,
      previewDayIdx: dayIdx,
    });
  };

  const handleEventPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!draggingEv) return;
    const dyMins = snapMinutes15(((e.clientY - draggingEv.startY) / ROW_HEIGHT) * 60);

    if (draggingEv.mode === 'resize') {
      const nextEnd = Math.min(
        endMinuteOffset,
        Math.max(draggingEv.origStartMin + 30, draggingEv.origEndMin + dyMins)
      );
      setDraggingEv((prev) => (prev ? { ...prev, previewEndMin: nextEnd } : null));
      return;
    }

    const duration = draggingEv.origEndMin - draggingEv.origStartMin;
    const nextStart = Math.min(
      endMinuteOffset - duration,
      Math.max(startMinuteOffset, draggingEv.origStartMin + dyMins)
    );
    const gridWidth = gridBodyRef.current?.clientWidth ?? 600;
    const colWidth = Math.max(60, gridWidth / dates.length);
    const dxCols = Math.round((e.clientX - draggingEv.startX) / colWidth);
    const nextDayIdx = Math.min(dates.length - 1, Math.max(0, draggingEv.origDayIdx + dxCols));

    setDraggingEv((prev) =>
      prev
        ? {
            ...prev,
            previewStartMin: nextStart,
            previewEndMin: nextStart + duration,
            previewDayIdx: nextDayIdx,
          }
        : null
    );
  };

  const handleEventPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (!draggingEv) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const moved =
      draggingEv.previewStartMin !== draggingEv.origStartMin ||
      draggingEv.previewEndMin !== draggingEv.origEndMin ||
      draggingEv.previewDayIdx !== draggingEv.origDayIdx;

    const { occ, previewDayIdx, previewStartMin, previewEndMin } = draggingEv;
    setDraggingEv(null);

    if (!moved) {
      onSelectOccurrence(occ);
      return;
    }

    const targetDate = dates[previewDayIdx] ?? occ.date;
    onMoveOrResizeEvent(occ.eventId, {
      dayOfWeek: getDayOfWeekFromIso(targetDate),
      date: occ.repeat === 'none' ? targetDate : null,
      start: minutesToTime(previewStartMin),
      end: minutesToTime(previewEndMin),
    });
  };

  const handleGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setFocusedCell((c) => ({ ...c, dayIdx: Math.min(dates.length - 1, c.dayIdx + 1) }));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setFocusedCell((c) => ({ ...c, dayIdx: Math.max(0, c.dayIdx - 1) }));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedCell((c) => ({ ...c, hourIdx: Math.min(totalHours - 1, c.hourIdx + 1) }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedCell((c) => ({ ...c, hourIdx: Math.max(0, c.hourIdx - 1) }));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const dateIso = dates[focusedCell.dayIdx] ?? todayIso;
      const slotStart = (startHour + focusedCell.hourIdx) * 60;
      const existing = occurrences.find(
        (o) =>
          o.date === dateIso &&
          timeToMinutes(o.start) <= slotStart &&
          timeToMinutes(o.end) > slotStart
      );
      if (existing) {
        onSelectOccurrence(existing);
      } else {
        onCreateSlot(dateIso, minutesToTime(slotStart), minutesToTime(slotStart + 60));
      }
    }
  };

  const showCurrentTime = nowMinutes >= startMinuteOffset && nowMinutes <= endMinuteOffset;
  const nowTopPx = ((nowMinutes - startMinuteOffset) / 60) * ROW_HEIGHT;

  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)]">
      {/* Header row */}
      <div className="grid border-b border-[var(--border)]" style={{ gridTemplateColumns: `46px repeat(${dates.length}, minmax(0, 1fr))` }}>
        <div className="border-r border-[var(--border)] px-1 py-2 text-center text-[10px] text-[var(--text-muted)]">
          Time
        </div>
        {dates.map((iso) => {
          const { weekday, dayNum } = formatDayShort(iso);
          const isToday = iso === todayIso;
          return (
            <div
              key={iso}
              className={`border-r border-[var(--border)] last:border-r-0 px-1 py-1.5 text-center ${
                isToday ? 'bg-[var(--surface-hover)]' : ''
              }`}
            >
              <div className="text-[10px] font-medium uppercase text-[var(--text-muted)]">
                {weekday}
              </div>
              <div
                className={`tabular-nums text-xs font-semibold ${
                  isToday ? 'text-[var(--primary)]' : 'text-[var(--text)]'
                }`}
              >
                {dayNum}
              </div>
              {dueTasks
                .filter((t) => t.dueDate === iso && t.status !== 'done')
                .slice(0, 2)
                .map((t) => (
                  <div
                    key={t.id}
                    title={`Task due: ${t.title}`}
                    className="mt-0.5 truncate rounded bg-[var(--primary)]/15 px-1 text-[9px] font-medium text-[var(--primary)]"
                  >
                    {t.title}
                  </div>
                ))}
            </div>
          );
        })}
      </div>

      {/* Scrollable grid body */}
      <div
        tabIndex={0}
        role="grid"
        aria-label="Timetable grid. Use arrow keys to move and Enter to create or edit."
        onKeyDown={handleGridKeyDown}
        className="relative max-h-[340px] overflow-y-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `46px repeat(${dates.length}, minmax(0, 1fr))`,
            height: `${totalHours * ROW_HEIGHT}px`,
          }}
        >
          {/* Hour labels */}
          <div className="relative border-r border-[var(--border)]">
            {hours.map((h) => (
              <div
                key={h}
                style={{ height: `${ROW_HEIGHT}px` }}
                className="border-b border-[var(--border)]/60 pr-1.5 pt-0.5 text-right tabular-nums text-[10px] text-[var(--text-muted)]"
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div
            ref={gridBodyRef}
            className="relative grid"
            style={{
              gridColumn: `span ${dates.length} / span ${dates.length}`,
              gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))`,
            }}
          >
            {dates.map((iso, dayIdx) => {
              const isToday = iso === todayIso;
              const dayOccs = occurrences.filter((o) => {
                if (draggingEv && draggingEv.occ.occurrenceKey === o.occurrenceKey) {
                  return draggingEv.previewDayIdx === dayIdx;
                }
                return o.date === iso;
              });

              return (
                <div
                  key={iso}
                  onPointerDown={(e) => handleColumnPointerDown(dayIdx, e)}
                  onPointerMove={handleColumnPointerMove}
                  onPointerUp={handleColumnPointerUp}
                  className={`relative border-r border-[var(--border)] last:border-r-0 select-none ${
                    isToday ? 'bg-[var(--surface-hover)]/50' : ''
                  }`}
                >
                  {hours.map((h, hourIdx) => {
                    const isFocused =
                      focusedCell.dayIdx === dayIdx && focusedCell.hourIdx === hourIdx;
                    return (
                      <div
                        key={h}
                        style={{ height: `${ROW_HEIGHT}px` }}
                        className={`border-b border-[var(--border)]/50 ${
                          isFocused ? 'bg-[var(--primary)]/10 ring-1 ring-inset ring-[var(--primary)]' : ''
                        }`}
                      />
                    );
                  })}

                  {/* Drag-to-create preview */}
                  {creating && creating.dayIdx === dayIdx && (
                    <div
                      style={{
                        top: `${((Math.min(creating.anchorMin, creating.currentMin) - startMinuteOffset) / 60) * ROW_HEIGHT}px`,
                        height: `${Math.max(20, (Math.abs(creating.currentMin - creating.anchorMin) / 60) * ROW_HEIGHT)}px`,
                      }}
                      className="pointer-events-none absolute inset-x-1 rounded-[6px] border border-dashed border-[var(--primary)] bg-[var(--primary)]/20"
                    />
                  )}

                  {/* Current time indicator */}
                  {isToday && showCurrentTime && (
                    <div
                      aria-hidden="true"
                      style={{ top: `${nowTopPx}px` }}
                      className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                    >
                      <span className="-ml-1 h-2 w-2 rounded-full bg-[var(--primary)]" />
                      <span className="h-[1.5px] flex-1 bg-[var(--primary)]" />
                    </div>
                  )}

                  {/* Event blocks */}
                  {dayOccs.map((occ) => {
                    const isDragged =
                      draggingEv && draggingEv.occ.occurrenceKey === occ.occurrenceKey;
                    const sMin = isDragged ? draggingEv.previewStartMin : timeToMinutes(occ.start);
                    const eMin = isDragged ? draggingEv.previewEndMin : timeToMinutes(occ.end);
                    const clampedStart = Math.max(startMinuteOffset, sMin);
                    const clampedEnd = Math.min(endMinuteOffset, eMin);
                    if (clampedEnd <= clampedStart) return null;

                    const top = ((clampedStart - startMinuteOffset) / 60) * ROW_HEIGHT;
                    const height = Math.max(22, ((clampedEnd - clampedStart) / 60) * ROW_HEIGHT);
                    const course = occ.courseId ? courseMap.get(occ.courseId) : undefined;
                    const accent = course?.color ?? 'var(--primary)';

                    return (
                      <div
                        key={occ.occurrenceKey}
                        data-event-block="true"
                        onPointerDown={(e) => handleEventPointerDown(occ, dayIdx, 'move', e)}
                        onPointerMove={handleEventPointerMove}
                        onPointerUp={handleEventPointerUp}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          borderLeftColor: accent,
                        }}
                        className={`group absolute inset-x-0.5 z-10 flex cursor-grab flex-col justify-between overflow-hidden rounded-[6px] border border-l-[3px] bg-[var(--bg)]/95 px-1.5 py-0.5 text-left shadow-[var(--shadow-sm)] active:cursor-grabbing ${
                          occ.hasConflict ? 'border-[var(--warning)]' : 'border-[var(--border)]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="truncate text-[11px] font-semibold leading-tight text-[var(--text)]">
                            {occ.title}
                          </span>
                          {occ.hasConflict && (
                            <AlertTriangle
                              size={11}
                              strokeWidth={2}
                              className="shrink-0 text-[var(--warning)]"
                            />
                          )}
                        </div>
                        {height >= 36 && (
                          <span className="truncate tabular-nums text-[10px] leading-tight text-[var(--text-muted)]">
                            {minutesToTime(sMin)}–{minutesToTime(eMin)}
                          </span>
                        )}
                        <div
                          onPointerDown={(e) => handleEventPointerDown(occ, dayIdx, 'resize', e)}
                          className="h-1.5 w-full cursor-ns-resize opacity-0 group-hover:opacity-100"
                          title="Drag to resize"
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
