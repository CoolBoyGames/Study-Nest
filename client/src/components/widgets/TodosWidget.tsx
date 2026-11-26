import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  CheckSquare,
  GripVertical,
  Pencil,
  Plus,
  Repeat,
  Search,
  Target,
  Timer,
  Trash2,
} from 'lucide-react';
import {
  filterTasks,
  getTodayIsoDate,
  parseQuickAdd,
  type Course,
  type DailyGoal,
  type PlannerTask,
  type TaskPriority,
  type TaskViewMode,
} from '@studyspace/shared';
import { plannerApi } from '../../api/planner';
import { tasksApi, type UpdateTaskPayload } from '../../api/tasks';
import { toolsApi } from '../../api/tools';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useToastStore } from '../../stores/useToastStore';
import { Button, EmptyState, IconButton, Input, ProgressBar, Select, Skeleton, Tabs } from '../ui';
import { TaskEditorModal } from './todos/TaskEditorModal';

const VIEW_TABS: { id: TaskViewMode; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'done', label: 'Done' },
  { id: 'course', label: 'All' },
];

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  high: 'text-[var(--warning)] border-[var(--warning)]',
  med: 'text-[var(--primary)] border-[var(--border-control)]',
  low: 'text-[var(--text-muted)] border-[var(--border)]',
};

export function TodosWidget() {
  const pushToast = useToastStore((s) => s.push);
  const activeTask = useSettingsStore((s) => s.activeTask);
  const setActiveTask = useSettingsStore((s) => s.setActiveTask);
  const setWidgetVisible = useSettingsStore((s) => s.setWidgetVisible);
  const selectedCourseId = useSettingsStore((s) => s.selectedCourseId);
  const setSelectedCourseId = useSettingsStore((s) => s.setSelectedCourseId);

  const [todayIso] = useState(() => getTodayIsoDate());
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [minutesByTask, setMinutesByTask] = useState<Record<string, number>>({});
  const [goal, setGoal] = useState<DailyGoal | null>(null);
  const [todayMinutes, setTodayMinutes] = useState(0);

  const [view, setView] = useState<TaskViewMode>('today');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [onlyNoCourse, setOnlyNoCourse] = useState(false);
  const courseFilter = onlyNoCourse ? 'none' : selectedCourseId || 'all';
  const [quickInput, setQuickInput] = useState('');

  const [editingGoal, setEditingGoal] = useState(false);
  const [goalTasksDraft, setGoalTasksDraft] = useState('5');
  const [goalMinutesDraft, setGoalMinutesDraft] = useState('120');

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshData = useCallback(async () => {
    try {
      const [taskList, courseList, dayRes, analytics, taskMins] = await Promise.all([
        tasksApi.listTasks(),
        plannerApi.listCourses(),
        toolsApi.getTodosDay(todayIso),
        toolsApi.getAnalyticsSummary(7),
        toolsApi.getMinutesByTask(),
      ]);
      setTasks(taskList);
      setCourses(courseList);
      setGoal(dayRes.goal);
      setGoalTasksDraft(String(dayRes.goal.targetTasks));
      setGoalMinutesDraft(String(dayRes.goal.targetMinutes));
      setTodayMinutes(analytics.todayMinutes);
      setMinutesByTask(taskMins);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [todayIso]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [taskList, courseList, dayRes, analytics, taskMins] = await Promise.all([
          tasksApi.listTasks(),
          plannerApi.listCourses(),
          toolsApi.getTodosDay(todayIso),
          toolsApi.getAnalyticsSummary(7),
          toolsApi.getMinutesByTask(),
        ]);
        if (cancelled) return;
        setTasks(taskList);
        setCourses(courseList);
        setGoal(dayRes.goal);
        setGoalTasksDraft(String(dayRes.goal.targetTasks));
        setGoalMinutesDraft(String(dayRes.goal.targetMinutes));
        setTodayMinutes(analytics.todayMinutes);
        setMinutesByTask(taskMins);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load tasks.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const onSession = () => {
      void refreshData();
    };
    window.addEventListener('studynest:session-logged', onSession);
    return () => {
      cancelled = true;
      window.removeEventListener('studynest:session-logged', onSession);
    };
  }, [refreshData, todayIso]);

  const parsedPreview = quickInput.trim()
    ? parseQuickAdd(quickInput, courses, todayIso)
    : null;

  const handleQuickAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    const parsed = parseQuickAdd(quickInput, courses, todayIso);
    const defaultDue =
      parsed.dueDate ?? (view === 'today' ? todayIso : null);
    setQuickInput('');

    try {
      const created = await tasksApi.createTask({
        title: parsed.title,
        priority: parsed.priority,
        courseId: parsed.courseId ?? (courseFilter !== 'all' && courseFilter !== 'none' ? courseFilter : null),
        dueDate: defaultDue,
        repeat: parsed.repeat,
      });
      setTasks((prev) => [...prev, created]);
      window.dispatchEvent(new CustomEvent('studynest:tasks-changed'));
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not create task.', 'warning');
    }
  };

  const handleToggleDone = async (task: PlannerTask) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      const res = await tasksApi.updateTask(task.id, { status: nextStatus });
      setTasks((prev) => {
        const updated = prev.map((t) => (t.id === res.task.id ? res.task : t));
        return res.nextTask ? [...updated, res.nextTask] : updated;
      });
      window.dispatchEvent(new CustomEvent('studynest:tasks-changed'));

      if (nextStatus === 'done') {
        pushToast(
          res.nextTask
            ? `Completed “${task.title}” · next scheduled`
            : `Completed “${task.title}”`,
          'success',
          {
            label: 'Undo',
            onAction: () => {
              void tasksApi.updateTask(task.id, { status: task.status }).then((undoRes) => {
                setTasks((prev) =>
                  prev
                    .filter((t) => t.id !== res.nextTask?.id)
                    .map((t) => (t.id === undoRes.task.id ? undoRes.task : t))
                );
                if (res.nextTask) {
                  void tasksApi.deleteTask(res.nextTask.id);
                }
                window.dispatchEvent(new CustomEvent('studynest:tasks-changed'));
              });
            },
          }
        );
      }
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not update task.', 'warning');
    }
  };

  const handleDeleteTask = async (task: PlannerTask) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await tasksApi.deleteTask(task.id);
      window.dispatchEvent(new CustomEvent('studynest:tasks-changed'));
      pushToast(`Deleted “${task.title}”`, 'info', {
        label: 'Undo',
        onAction: () => {
          void tasksApi
            .createTask({
              title: task.title,
              notes: task.notes,
              dueDate: task.dueDate,
              priority: task.priority,
              courseId: task.courseId,
              status: task.status,
              repeat: task.repeat,
              subtasks: task.subtasks.map((s) => s.title),
            })
            .then((restored) => {
              setTasks((prev) => [...prev, restored]);
              window.dispatchEvent(new CustomEvent('studynest:tasks-changed'));
            });
        },
      });
    } catch (err) {
      void refreshData();
      pushToast(err instanceof Error ? err.message : 'Could not delete task.', 'warning');
    }
  };

  const handleDropReorder = async (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const fromIdx = tasks.findIndex((t) => t.id === draggedId);
    const toIdx = tasks.findIndex((t) => t.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...tasks];
    const [moved] = reordered.splice(fromIdx, 1);
    if (!moved) return;
    reordered.splice(toIdx, 0, moved);
    setTasks(reordered);
    setDraggedId(null);

    try {
      await tasksApi.reorderTasks(reordered.map((t) => t.id));
    } catch {
      void refreshData();
    }
  };

  const handleSaveTask = async (taskId: string, patch: UpdateTaskPayload) => {
    const res = await tasksApi.updateTask(taskId, patch);
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === res.task.id ? res.task : t));
      return res.nextTask ? [...next, res.nextTask] : next;
    });
    window.dispatchEvent(new CustomEvent('studynest:tasks-changed'));
    pushToast('Task saved.', 'success');
  };

  const handleAddSubtask = async (taskId: string, title: string) => {
    const sub = await tasksApi.addSubtask(taskId, title);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, subtasks: [...t.subtasks, sub] } : t))
    );
  };

  const handleToggleSubtask = async (subId: string, done: boolean) => {
    const updated = await tasksApi.updateSubtask(subId, { done });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === updated.taskId
          ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subId ? updated : s)) }
          : t
      )
    );
  };

  const handleDeleteSubtask = async (subId: string) => {
    await tasksApi.deleteSubtask(subId);
    setTasks((prev) =>
      prev.map((t) => ({ ...t, subtasks: t.subtasks.filter((s) => s.id !== subId) }))
    );
  };

  const handleFocusTask = (task: PlannerTask) => {
    setActiveTask({ id: task.id, title: task.title });
    setWidgetVisible('pomodoro', true);
    pushToast(`Focusing on “${task.title}”`, 'info');
  };

  const handleSaveGoal = async (e: FormEvent) => {
    e.preventDefault();
    const targetTasks = Math.min(50, Math.max(1, Math.round(Number(goalTasksDraft) || 5)));
    const targetMinutes = Math.min(720, Math.max(5, Math.round(Number(goalMinutesDraft) || 120)));
    try {
      const updated = await toolsApi.updateGoal(todayIso, targetMinutes, targetTasks);
      setGoal(updated);
      setEditingGoal(false);
      pushToast('Daily study goals updated.', 'success');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not update goals.', 'warning');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
        <p className="text-sm text-[var(--text)]">{error}</p>
        <Button variant="outline" size="sm" onClick={() => void refreshData()}>
          Retry
        </Button>
      </div>
    );
  }

  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const doneTodayCount = tasks.filter(
    (t) => t.status === 'done' && (t.dueDate === todayIso || t.completedAt?.startsWith(todayIso))
  ).length;
  const targetTasks = goal?.targetTasks ?? 5;
  const targetMinutes = goal?.targetMinutes ?? 120;

  const visibleTasks = filterTasks(
    tasks,
    view,
    { search, priority: priorityFilter, courseId: courseFilter },
    todayIso
  );

  const editingTask = editingTaskId ? tasks.find((t) => t.id === editingTaskId) ?? null : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Daily goals */}
      <div className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-2.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
            <Target size={14} strokeWidth={1.5} />
            Goals ({doneTodayCount}/{targetTasks} tasks · {todayMinutes}/{targetMinutes}m)
          </span>
          <Button variant="ghost" size="sm" onClick={() => setEditingGoal((v) => !v)}>
            {editingGoal ? 'Done' : 'Edit'}
          </Button>
        </div>
        {editingGoal ? (
          <form onSubmit={(e) => void handleSaveGoal(e)} className="flex items-end gap-2">
            <Input
              label="Tasks"
              type="number"
              min={1}
              max={50}
              value={goalTasksDraft}
              onChange={(e) => setGoalTasksDraft(e.target.value)}
            />
            <Input
              label="Focus (min)"
              type="number"
              min={5}
              max={720}
              value={goalMinutesDraft}
              onChange={(e) => setGoalMinutesDraft(e.target.value)}
            />
            <Button type="submit" size="sm">
              Save
            </Button>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <ProgressBar
              value={(doneTodayCount / Math.max(1, targetTasks)) * 100}
              label="Daily tasks goal"
            />
            <ProgressBar
              value={(todayMinutes / Math.max(1, targetMinutes)) * 100}
              label="Daily focus minutes goal"
            />
          </div>
        )}
      </div>

      {/* Views */}
      <Tabs items={VIEW_TABS} value={view} onChange={setView} ariaLabel="Task views" />

      {/* Search + filters */}
      <div className="grid grid-cols-2 gap-1.5 @[320px]:grid-cols-4">
        <div className="relative col-span-2">
          <Input
            aria-label="Search tasks"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
          <Search
            size={14}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
        </div>
        <Select
          aria-label="Filter by priority"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as 'all' | TaskPriority)}
          options={[
            { value: 'all', label: 'All prio' },
            { value: 'high', label: 'High' },
            { value: 'med', label: 'Medium' },
            { value: 'low', label: 'Low' },
          ]}
        />
        <Select
          aria-label="Filter by course"
          value={courseFilter}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'none') {
              setOnlyNoCourse(true);
            } else {
              setOnlyNoCourse(false);
              setSelectedCourseId(val === 'all' ? '' : val);
            }
          }}
          options={[
            { value: 'all', label: 'All courses' },
            { value: 'none', label: 'No course' },
            ...courses.map((c) => ({ value: c.id, label: c.code || c.name })),
          ]}
        />
      </div>

      {/* Quick add with inline syntax */}
      <form onSubmit={(e) => void handleQuickAdd(e)} className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              aria-label="New task"
              placeholder='Quick add: "Essay !high #cs201 tomorrow"'
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
            />
          </div>
          <IconButton type="submit" label="Add task">
            <Plus size={18} strokeWidth={1.5} />
          </IconButton>
        </div>
        {parsedPreview && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span className="rounded border border-[var(--border)] px-1.5 py-0.5">
              {parsedPreview.priority}
            </span>
            {parsedPreview.courseId && (
              <span className="rounded border border-[var(--border)] px-1.5 py-0.5">
                {courseMap.get(parsedPreview.courseId)?.code || 'Course'}
              </span>
            )}
            {parsedPreview.dueDate && (
              <span className="rounded border border-[var(--border)] px-1.5 py-0.5">
                {parsedPreview.dueDate}
              </span>
            )}
            {parsedPreview.repeat !== 'none' && (
              <span className="rounded border border-[var(--border)] px-1.5 py-0.5">
                {parsedPreview.repeat}
              </span>
            )}
          </div>
        )}
      </form>

      {/* Task list */}
      {visibleTasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={22} strokeWidth={1.5} />}
          message="No tasks in this view."
        />
      ) : (
        <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1">
          {visibleTasks.map((task) => {
            const course = task.courseId ? courseMap.get(task.courseId) : undefined;
            const loggedMins = minutesByTask[task.id] ?? 0;
            const doneSubs = task.subtasks.filter((s) => s.done).length;
            const isFocused = activeTask?.id === task.id;

            return (
              <li
                key={task.id}
                draggable
                onDragStart={() => setDraggedId(task.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => void handleDropReorder(task.id)}
                className={`flex items-start gap-1.5 rounded-[var(--radius-sm)] border bg-[var(--surface)] px-2 py-1.5 transition-colors ${
                  isFocused ? 'border-[var(--primary)]' : 'border-[var(--border)]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="mt-2.5 cursor-grab text-[var(--text-muted)]"
                  title="Drag to reorder"
                >
                  <GripVertical size={14} strokeWidth={1.5} />
                </span>

                <button
                  type="button"
                  role="checkbox"
                  aria-checked={task.status === 'done'}
                  aria-label={`Mark "${task.title}" as ${task.status === 'done' ? 'todo' : 'done'}`}
                  onClick={() => void handleToggleDone(task)}
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)]"
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-[5px] border transition-transform duration-150 ${
                      task.status === 'done'
                        ? 'scale-105 border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]'
                        : 'border-[var(--border-control)] bg-[var(--bg)]'
                    }`}
                  >
                    {task.status === 'done' && <Check size={13} strokeWidth={2.5} />}
                  </span>
                </button>

                <div className="min-w-0 flex-1 py-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`truncate text-sm font-medium ${
                        task.status === 'done'
                          ? 'line-through text-[var(--text-muted)]'
                          : 'text-[var(--text)]'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                    <span
                      className={`rounded border px-1 py-0 text-[10px] uppercase ${PRIORITY_STYLE[task.priority]}`}
                    >
                      {task.priority}
                    </span>
                    {course && (
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: course.color }}
                        />
                        {course.code || course.name}
                      </span>
                    )}
                    {task.dueDate && <span className="tabular-nums">{task.dueDate}</span>}
                    {task.repeat !== 'none' && (
                      <span className="inline-flex items-center gap-0.5">
                        <Repeat size={10} strokeWidth={1.5} />
                        {task.repeat}
                      </span>
                    )}
                    {task.subtasks.length > 0 && (
                      <span className="tabular-nums">
                        {doneSubs}/{task.subtasks.length} sub
                      </span>
                    )}
                    {loggedMins > 0 && (
                      <span className="tabular-nums text-[var(--primary)]">{loggedMins}m</span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center">
                  {task.status !== 'done' && (
                    <IconButton
                      label={`Focus on ${task.title}`}
                      active={isFocused}
                      onClick={() => handleFocusTask(task)}
                    >
                      <Timer size={15} strokeWidth={1.5} />
                    </IconButton>
                  )}
                  <IconButton
                    label={`Edit ${task.title}`}
                    onClick={() => setEditingTaskId(task.id)}
                  >
                    <Pencil size={15} strokeWidth={1.5} />
                  </IconButton>
                  <IconButton
                    label={`Delete ${task.title}`}
                    onClick={() => void handleDeleteTask(task)}
                  >
                    <Trash2 size={15} strokeWidth={1.5} />
                  </IconButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editingTask && (
        <TaskEditorModal
          key={editingTask.id}
          open={Boolean(editingTask)}
          onClose={() => setEditingTaskId(null)}
          task={editingTask}
          courses={courses}
          onSave={handleSaveTask}
          onAddSubtask={handleAddSubtask}
          onToggleSubtask={handleToggleSubtask}
          onDeleteSubtask={handleDeleteSubtask}
        />
      )}
    </div>
  );
}
