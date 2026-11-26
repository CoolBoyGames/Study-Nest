import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Check, CheckSquare, Plus, Target, Trash2 } from 'lucide-react';
import type { DailyGoal, TodoItem } from '@studyspace/shared';
import { toolsApi } from '../../api/tools';
import { useToastStore } from '../../stores/useToastStore';
import { Button, EmptyState, IconButton, Input, ProgressBar, Skeleton } from '../ui';

export function TodosWidget() {
  const pushToast = useToastStore((s) => s.push);

  const [date, setDate] = useState('');
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [goal, setGoal] = useState<DailyGoal | null>(null);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [newTitle, setNewTitle] = useState('');

  const [editingGoal, setEditingGoal] = useState(false);
  const [goalTasksDraft, setGoalTasksDraft] = useState('5');
  const [goalMinutesDraft, setGoalMinutesDraft] = useState('120');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshData = useCallback(async () => {
    try {
      const [dayRes, analytics] = await Promise.all([
        toolsApi.getTodosDay(),
        toolsApi.getAnalyticsSummary(7),
      ]);
      setDate(dayRes.date);
      setTodos(dayRes.todos);
      setGoal(dayRes.goal);
      setGoalTasksDraft(String(dayRes.goal.targetTasks));
      setGoalMinutesDraft(String(dayRes.goal.targetMinutes));
      setTodayMinutes(analytics.todayMinutes);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dayRes, analytics] = await Promise.all([
          toolsApi.getTodosDay(),
          toolsApi.getAnalyticsSummary(7),
        ]);
        if (cancelled) return;
        setDate(dayRes.date);
        setTodos(dayRes.todos);
        setGoal(dayRes.goal);
        setGoalTasksDraft(String(dayRes.goal.targetTasks));
        setGoalMinutesDraft(String(dayRes.goal.targetMinutes));
        setTodayMinutes(analytics.todayMinutes);
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
  }, [refreshData]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle('');
    try {
      const created = await toolsApi.createTodo(title, date || undefined);
      setTodos((prev) => [...prev, created]);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not add task.', 'warning');
    }
  };

  const handleToggle = async (item: TodoItem) => {
    const nextCompleted = !item.completed;
    setTodos((prev) =>
      prev.map((t) => (t.id === item.id ? { ...t, completed: nextCompleted } : t))
    );
    try {
      await toolsApi.updateTodo(item.id, { completed: nextCompleted });
    } catch (err) {
      setTodos((prev) => prev.map((t) => (t.id === item.id ? item : t)));
      pushToast(err instanceof Error ? err.message : 'Could not update task.', 'warning');
    }
  };

  const handleDelete = async (id: string) => {
    const prev = todos;
    setTodos((list) => list.filter((t) => t.id !== id));
    try {
      await toolsApi.deleteTodo(id);
    } catch (err) {
      setTodos(prev);
      pushToast(err instanceof Error ? err.message : 'Could not delete task.', 'warning');
    }
  };

  const handleSaveGoal = async (e: FormEvent) => {
    e.preventDefault();
    if (!date) return;
    const targetTasks = Math.min(50, Math.max(1, Math.round(Number(goalTasksDraft) || 5)));
    const targetMinutes = Math.min(720, Math.max(5, Math.round(Number(goalMinutesDraft) || 120)));
    try {
      const updated = await toolsApi.updateGoal(date, targetMinutes, targetTasks);
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
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
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

  const completedCount = todos.filter((t) => t.completed).length;
  const targetTasks = goal?.targetTasks ?? 5;
  const targetMinutes = goal?.targetMinutes ?? 120;
  const taskProgress = (completedCount / Math.max(1, targetTasks)) * 100;
  const minuteProgress = (todayMinutes / Math.max(1, targetMinutes)) * 100;

  return (
    <div className="flex flex-col gap-3">
      {/* Daily goals */}
      <div className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
            <Target size={14} strokeWidth={1.5} />
            Daily Goals ({date})
          </span>
          <Button variant="ghost" size="sm" onClick={() => setEditingGoal((v) => !v)}>
            {editingGoal ? 'Done' : 'Edit'}
          </Button>
        </div>

        {editingGoal ? (
          <form onSubmit={(e) => void handleSaveGoal(e)} className="flex items-end gap-2 pt-1">
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
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">Tasks</span>
                <span className="tabular-nums font-medium text-[var(--text)]">
                  {completedCount} / {targetTasks}
                </span>
              </div>
              <ProgressBar value={taskProgress} label="Daily tasks goal" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">Focus time</span>
                <span className="tabular-nums font-medium text-[var(--text)]">
                  {todayMinutes} / {targetMinutes} min
                </span>
              </div>
              <ProgressBar value={minuteProgress} label="Daily focus minutes goal" />
            </div>
          </div>
        )}
      </div>

      {/* Add task */}
      <form onSubmit={(e) => void handleAdd(e)} className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            aria-label="New task"
            placeholder="Add a study task…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
        </div>
        <IconButton type="submit" label="Add task">
          <Plus size={18} strokeWidth={1.5} />
        </IconButton>
      </form>

      {/* Task list */}
      {todos.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={22} strokeWidth={1.5} />}
          message="No tasks planned for today yet."
        />
      ) : (
        <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-1">
          {todos.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={item.completed}
                aria-label={`Mark "${item.title}" as ${item.completed ? 'incomplete' : 'complete'}`}
                onClick={() => void handleToggle(item)}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)]"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-[5px] border transition-colors ${
                    item.completed
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]'
                      : 'border-[var(--border-control)] bg-[var(--bg)]'
                  }`}
                >
                  {item.completed && <Check size={13} strokeWidth={2.5} />}
                </span>
              </button>

              <span
                className={`min-w-0 flex-1 text-sm ${
                  item.completed
                    ? 'line-through text-[var(--text-muted)]'
                    : 'text-[var(--text)]'
                }`}
              >
                {item.title}
              </span>

              <IconButton
                label={`Delete "${item.title}"`}
                onClick={() => void handleDelete(item.id)}
              >
                <Trash2 size={15} strokeWidth={1.5} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
