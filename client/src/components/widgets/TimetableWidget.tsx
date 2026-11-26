import { useCallback, useEffect, useState } from 'react';
import { BookMarked, ChevronLeft, ChevronRight, Plus, Settings2 } from 'lucide-react';
import {
  addDaysIso,
  expandEvents,
  getTodayIsoDate,
  getWeekRangeIso,
  type Course,
  type ExpandedTimetableOccurrence,
  type PlannerTask,
  type TimetableEvent,
} from '@studyspace/shared';
import { plannerApi, type CoursePayload, type EventPayload } from '../../api/planner';
import { tasksApi } from '../../api/tasks';
import { useContainerWidth } from '../../hooks/useContainerWidth';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useToastStore } from '../../stores/useToastStore';
import { Button, IconButton, Select, Skeleton, Tabs } from '../ui';
import { NextUpBar } from './timetable/NextUpBar';
import { TimetableAgenda } from './timetable/TimetableAgenda';
import {
  CoursesModal,
  EventEditorModal,
  SemesterSettingsModal,
} from './timetable/TimetableModals';
import { TimetableWeekGrid } from './timetable/TimetableWeekGrid';

type TimetableView = 'week' | 'day' | 'agenda';

const VIEW_TABS: { id: TimetableView; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
  { id: 'agenda', label: 'Agenda' },
];

export function TimetableWidget() {
  const semester = useSettingsStore((s) => s.semester);
  const updateSemester = useSettingsStore((s) => s.updateSemester);
  const selectedCourseId = useSettingsStore((s) => s.selectedCourseId);
  const setSelectedCourseId = useSettingsStore((s) => s.setSelectedCourseId);
  const pushToast = useToastStore((s) => s.push);

  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<TimetableEvent[]>([]);
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [view, setView] = useState<TimetableView>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'day' : 'week'
  );
  const [anchorDate, setAnchorDate] = useState(() => getTodayIsoDate());
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 640
  );
  const [containerRef, containerWidth] = useContainerWidth(640);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimetableEvent | null>(null);
  const [initialSlot, setInitialSlot] = useState<{
    dateIso: string;
    start: string;
    end: string;
  } | null>(null);
  const [coursesModalOpen, setCoursesModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [cList, eList, tList] = await Promise.all([
        plannerApi.listCourses(),
        plannerApi.listEvents(),
        tasksApi.listTasks(),
      ]);
      setCourses(cList);
      setEvents(eList);
      setTasks(tList);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load timetable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cList, eList, tList] = await Promise.all([
          plannerApi.listCourses(),
          plannerApi.listEvents(),
          tasksApi.listTasks(),
        ]);
        if (cancelled) return;
        setCourses(cList);
        setEvents(eList);
        setTasks(tList);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load timetable.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const onResize = () => setIsNarrow(window.innerWidth < 640);
    const onTasksChanged = () => {
      void tasksApi.listTasks().then(setTasks).catch(() => {});
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('studynest:tasks-changed', onTasksChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
      window.removeEventListener('studynest:tasks-changed', onTasksChanged);
    };
  }, []);

  const todayIso = getTodayIsoDate();
  const weekRange = getWeekRangeIso(anchorDate, semester.weekStart);
  const compactMode = isNarrow || containerWidth < 520;
  const activeView: TimetableView = compactMode && view === 'week' ? 'day' : view;
  const visibleDates = activeView === 'day' ? [anchorDate] : weekRange.dates;

  const rangeStart = activeView === 'day' ? anchorDate : weekRange.startIso;
  const rangeEnd = activeView === 'day' ? anchorDate : weekRange.endIso;
  const filteredEvents = selectedCourseId
    ? events.filter((e) => e.courseId === selectedCourseId)
    : events;
  const occurrences = expandEvents(filteredEvents, rangeStart, rangeEnd, semester);
  const dueTasks = tasks.filter(
    (t) =>
      t.dueDate &&
      t.dueDate >= rangeStart &&
      t.dueDate <= rangeEnd &&
      t.status !== 'done' &&
      (!selectedCourseId || t.courseId === selectedCourseId)
  );

  const handleOpenCreate = (dateIso = anchorDate, start = '09:00', end = '10:00') => {
    setEditingEvent(null);
    setInitialSlot({ dateIso, start, end });
    setEditorOpen(true);
  };

  const handleSelectOccurrence = (occ: ExpandedTimetableOccurrence) => {
    const found = events.find((e) => e.id === occ.eventId) ?? null;
    setEditingEvent(found);
    setInitialSlot(null);
    setEditorOpen(true);
  };

  const handleSaveEvent = async (payload: EventPayload, eventId?: string) => {
    if (eventId) {
      const updated = await plannerApi.updateEvent(eventId, payload);
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      pushToast('Event updated.', 'success');
    } else {
      const created = await plannerApi.createEvent(payload);
      setEvents((prev) => [...prev, created]);
      pushToast('Event added.', 'success');
    }
  };

  const handleDeleteEvent = async (ev: TimetableEvent) => {
    await plannerApi.deleteEvent(ev.id);
    setEvents((prev) => prev.filter((e) => e.id !== ev.id));
    pushToast(`Deleted “${ev.title}”.`, 'info');
  };

  const handleMoveOrResize = async (
    eventId: string,
    patch: { dayOfWeek: number; date: string | null; start: string; end: string }
  ) => {
    try {
      const updated = await plannerApi.updateEvent(eventId, patch);
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not update event.', 'warning');
    }
  };

  const handleCreateCourse = async (payload: CoursePayload) => {
    const created = await plannerApi.createCourse(payload);
    setCourses((prev) => [...prev, created]);
    pushToast(`Course “${created.code || created.name}” added.`, 'success');
  };

  const handleDeleteCourse = async (id: string) => {
    await plannerApi.deleteCourse(id);
    setCourses((prev) => prev.filter((c) => c.id !== id));
    setEvents((prev) => prev.map((e) => (e.courseId === id ? { ...e, courseId: null } : e)));
    pushToast('Course removed.', 'info');
  };

  const handleImportIcs = async (ics: string) => {
    const res = await plannerApi.importIcs(ics);
    setEvents((prev) => [...prev, ...res.events]);
    pushToast(`Imported ${res.imported} calendar events.`, 'success');
    setSettingsModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
        <p className="text-sm text-[var(--text)]">{error}</p>
        <Button variant="outline" size="sm" onClick={() => void reload()}>
          Retry
        </Button>
      </div>
    );
  }

  const stepDays = activeView === 'day' ? 1 : 7;

  return (
    <div ref={containerRef} className="flex flex-col gap-3">
      <NextUpBar events={events} courses={courses} semester={semester} />

      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <IconButton
            label="Previous"
            onClick={() => setAnchorDate((d) => addDaysIso(d, -stepDays))}
          >
            <ChevronLeft size={16} strokeWidth={1.5} />
          </IconButton>
          <Button variant="outline" size="sm" onClick={() => setAnchorDate(todayIso)}>
            Today
          </Button>
          <IconButton
            label="Next"
            onClick={() => setAnchorDate((d) => addDaysIso(d, stepDays))}
          >
            <ChevronRight size={16} strokeWidth={1.5} />
          </IconButton>
        </div>

        <div className="flex items-center gap-1">
          <div className="w-32">
            <Select
              aria-label="Filter timetable by course"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              options={[
                { value: '', label: 'All courses' },
                ...courses.map((c) => ({ value: c.id, label: c.code || c.name })),
              ]}
            />
          </div>
          <IconButton label="Manage courses" onClick={() => setCoursesModalOpen(true)}>
            <BookMarked size={16} strokeWidth={1.5} />
          </IconButton>
          <IconButton label="Semester & ICS settings" onClick={() => setSettingsModalOpen(true)}>
            <Settings2 size={16} strokeWidth={1.5} />
          </IconButton>
          <Button size="sm" onClick={() => handleOpenCreate()}>
            <Plus size={15} strokeWidth={1.5} />
            Event
          </Button>
        </div>
      </div>

      <Tabs
        items={compactMode ? VIEW_TABS.filter((t) => t.id !== 'week') : VIEW_TABS}
        value={activeView}
        onChange={setView}
        ariaLabel="Timetable view"
      />

      {activeView === 'agenda' ? (
        <TimetableAgenda
          occurrences={occurrences}
          dueTasks={dueTasks}
          courses={courses}
          todayIso={todayIso}
          onSelectOccurrence={handleSelectOccurrence}
          onCreateNew={() => handleOpenCreate()}
        />
      ) : (
        <>
          <TimetableWeekGrid
            dates={visibleDates}
            occurrences={occurrences}
            dueTasks={dueTasks}
            courses={courses}
            semester={semester}
            todayIso={todayIso}
            onCreateSlot={handleOpenCreate}
            onSelectOccurrence={handleSelectOccurrence}
            onMoveOrResizeEvent={(id, patch) => void handleMoveOrResize(id, patch)}
          />
          {compactMode && (
            <div className="border-t border-[var(--border)] pt-2">
              <TimetableAgenda
                occurrences={occurrences}
                dueTasks={dueTasks}
                courses={courses}
                todayIso={todayIso}
                onSelectOccurrence={handleSelectOccurrence}
                onCreateNew={() => handleOpenCreate()}
              />
            </div>
          )}
        </>
      )}

      {editorOpen && (
        <EventEditorModal
          key={editingEvent?.id ?? initialSlot?.dateIso ?? 'new'}
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          courses={courses}
          existingEvents={events}
          editingEvent={editingEvent}
          initialSlot={initialSlot}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      )}

      <CoursesModal
        open={coursesModalOpen}
        onClose={() => setCoursesModalOpen(false)}
        courses={courses}
        onCreate={handleCreateCourse}
        onDelete={handleDeleteCourse}
      />

      <SemesterSettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        semester={semester}
        onUpdateSemester={updateSemester}
        onImportIcs={handleImportIcs}
        onExportIcs={() => plannerApi.downloadIcs(semester)}
      />
    </div>
  );
}

export default TimetableWidget;
