import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Check, CheckSquare, Flame, ArrowRight } from 'lucide-react';
import {
  getTodayIsoDate,
  type AnalyticsSummary,
  type Course,
  type PlannerTask,
  type SrsStats,
  type TimetableEvent,
} from '@studyspace/shared';
import { plannerApi } from '../../api/planner';
import { tasksApi } from '../../api/tasks';
import { toolsApi } from '../../api/tools';
import { vocabApi } from '../../api/vocab';
import { useT } from '../../i18n';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { Button, ProgressBar, Select, Skeleton } from '../ui';
import { NextUpBar } from './timetable/NextUpBar';

export function TodayWidget() {
  const { t } = useT();
  const semester = useSettingsStore((s) => s.semester);
  const selectedCourseId = useSettingsStore((s) => s.selectedCourseId);
  const setSelectedCourseId = useSettingsStore((s) => s.setSelectedCourseId);
  const setWidgetVisible = useSettingsStore((s) => s.setWidgetVisible);

  const [todayIso] = useState(() => getTodayIsoDate());
  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<TimetableEvent[]>([]);
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [vocabStats, setVocabStats] = useState<SrsStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [cList, eList, tList, vStats, aSum] = await Promise.all([
        plannerApi.listCourses(),
        plannerApi.listEvents(),
        tasksApi.listTasks(),
        vocabApi.getStats(),
        toolsApi.getAnalyticsSummary(7),
      ]);
      setCourses(cList);
      setEvents(eList);
      setTasks(tList);
      setVocabStats(vStats);
      setAnalytics(aSum);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Today overview.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cList, eList, tList, vStats, aSum] = await Promise.all([
          plannerApi.listCourses(),
          plannerApi.listEvents(),
          tasksApi.listTasks(),
          vocabApi.getStats(),
          toolsApi.getAnalyticsSummary(7),
        ]);
        if (cancelled) return;
        setCourses(cList);
        setEvents(eList);
        setTasks(tList);
        setVocabStats(vStats);
        setAnalytics(aSum);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load Today overview.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const onChange = () => {
      void refresh();
    };
    window.addEventListener('studynest:session-logged', onChange);
    window.addEventListener('studynest:tasks-changed', onChange);
    return () => {
      cancelled = true;
      window.removeEventListener('studynest:session-logged', onChange);
      window.removeEventListener('studynest:tasks-changed', onChange);
    };
  }, [refresh]);

  const handleToggleTask = async (task: PlannerTask) => {
    const res = await tasksApi.updateTask(task.id, { status: 'done' });
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === res.task.id ? res.task : t));
      return res.nextTask ? [...next, res.nextTask] : next;
    });
    window.dispatchEvent(new CustomEvent('studynest:tasks-changed'));
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
        <p className="text-sm text-[var(--text)]">{error}</p>
        <Button variant="outline" size="sm" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  const filteredEvents = selectedCourseId
    ? events.filter((e) => e.courseId === selectedCourseId)
    : events;

  const dueTodayTasks = tasks.filter(
    (t) =>
      t.status !== 'done' &&
      t.dueDate === todayIso &&
      (!selectedCourseId || t.courseId === selectedCourseId)
  );

  const todayMins = analytics?.todayMinutes ?? 0;
  const goalMins = analytics?.dailyGoalMinutes ?? 120;

  return (
    <div className="flex flex-col gap-3">
      {/* Shared course selector */}
      <Select
        aria-label={t('today.courseFilter')}
        value={selectedCourseId}
        onChange={(e) => setSelectedCourseId(e.target.value)}
        options={[
          { value: '', label: t('today.allCourses') },
          ...courses.map((c) => ({
            value: c.id,
            label: c.code ? `${c.code} · ${c.name}` : c.name,
          })),
        ]}
      />

      {/* Next class */}
      <NextUpBar events={filteredEvents} courses={courses} semester={semester} />

      {/* Focus minutes + Vocab due */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1 truncate">
              <Flame size={13} strokeWidth={1.5} className="shrink-0 text-[var(--warning)]" />
              {t('today.focusToday')}
            </span>
            <span className="tabular-nums font-semibold text-[var(--text)]">
              {todayMins} / {goalMins}m
            </span>
          </div>
          <ProgressBar
            value={(todayMins / Math.max(1, goalMins)) * 100}
            label={t('today.focusToday')}
          />
        </div>

        <button
          type="button"
          onClick={() => setWidgetVisible('vocab', true)}
          className="flex cursor-pointer flex-col justify-between rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-2.5 text-left hover:bg-[var(--surface-hover)]"
        >
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1 truncate">
              <BookOpen size={13} strokeWidth={1.5} className="shrink-0" />
              {t('today.vocabDue')}
            </span>
            <ArrowRight size={13} strokeWidth={1.5} className="shrink-0" />
          </div>
          <div className="tabular-nums text-lg font-semibold text-[var(--primary)]">
            {vocabStats?.dueToday ?? 0}
          </div>
        </button>
      </div>

      {/* Tasks due today */}
      <div className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 truncate text-xs font-medium text-[var(--text-muted)]">
            <CheckSquare size={14} strokeWidth={1.5} className="shrink-0" />
            {t('today.tasksDue', { count: dueTodayTasks.length })}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setWidgetVisible('todos', true)}>
            {t('today.openTasks')}
          </Button>
        </div>

        {dueTodayTasks.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">{t('today.noTasksDue')}</p>
        ) : (
          <ul className="flex max-h-36 flex-col gap-1 overflow-y-auto">
            {dueTodayTasks.slice(0, 5).map((task) => (
              <li key={task.id} className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Complete ${task.title}`}
                  onClick={() => void handleToggleTask(task)}
                  className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border border-[var(--border-control)] hover:bg-[var(--surface-hover)]"
                >
                  <Check size={13} strokeWidth={2} className="opacity-30 hover:opacity-100" />
                </button>
                <span className="truncate text-xs text-[var(--text)]">{task.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
