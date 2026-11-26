import { useState, type FormEvent } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import type {
  Course,
  PlannerTask,
  TaskPriority,
  TaskRepeat,
  TaskStatus,
} from '@studyspace/shared';
import type { UpdateTaskPayload } from '../../../api/tasks';
import { Button, IconButton, Input, Modal, Select } from '../../ui';

export interface TaskEditorModalProps {
  open: boolean;
  onClose: () => void;
  task: PlannerTask;
  courses: Course[];
  onSave: (taskId: string, patch: UpdateTaskPayload) => Promise<void>;
  onAddSubtask: (taskId: string, title: string) => Promise<void>;
  onToggleSubtask: (subtaskId: string, done: boolean) => Promise<void>;
  onDeleteSubtask: (subtaskId: string) => Promise<void>;
}

export function TaskEditorModal({
  open,
  onClose,
  task,
  courses,
  onSave,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TaskEditorModalProps) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [dueDate, setDueDate] = useState(task.dueDate ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [courseId, setCourseId] = useState(task.courseId ?? '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [repeat, setRepeat] = useState<TaskRepeat>(task.repeat);
  const [newSub, setNewSub] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave(task.id, {
        title: title.trim(),
        notes: notes.trim(),
        dueDate: dueDate || null,
        priority,
        courseId: courseId || null,
        status,
        repeat,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleAddSub = async () => {
    if (!newSub.trim()) return;
    await onAddSubtask(task.id, newSub.trim());
    setNewSub('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit task">
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
        <Input
          label="Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Due date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'med', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Select
            label="Course"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            options={[
              { value: '', label: 'None' },
              ...courses.map((c) => ({
                value: c.id,
                label: c.code || c.name,
              })),
            ]}
          />
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            options={[
              { value: 'todo', label: 'To do' },
              { value: 'doing', label: 'Doing' },
              { value: 'done', label: 'Done' },
            ]}
          />
          <Select
            label="Repeat"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value as TaskRepeat)}
            options={[
              { value: 'none', label: 'None' },
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
            ]}
          />
        </div>

        <Input
          label="Notes"
          placeholder="Details or links"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* Subtasks */}
        <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-2">
          <span className="text-xs font-medium text-[var(--text-muted)]">Subtasks</span>
          {task.subtasks.length > 0 && (
            <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto">
              {task.subtasks.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={s.done}
                    aria-label={`Toggle subtask ${s.title}`}
                    onClick={() => void onToggleSubtask(s.id, !s.done)}
                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border border-[var(--border-control)]"
                  >
                    {s.done && <Check size={13} strokeWidth={2.5} className="text-[var(--primary)]" />}
                  </button>
                  <span
                    className={`flex-1 text-xs ${
                      s.done ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text)]'
                    }`}
                  >
                    {s.title}
                  </span>
                  <IconButton
                    label={`Delete subtask ${s.title}`}
                    onClick={() => void onDeleteSubtask(s.id)}
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                aria-label="New subtask"
                placeholder="Add subtask…"
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleAddSub();
                  }
                }}
              />
            </div>
            <IconButton label="Add subtask" onClick={() => void handleAddSub()}>
              <Plus size={16} strokeWidth={1.5} />
            </IconButton>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
