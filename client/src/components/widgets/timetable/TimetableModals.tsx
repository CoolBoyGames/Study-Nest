import { useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, Download, Plus, Trash2, Upload } from 'lucide-react';
import {
  findConflictsForDraft,
  getDayOfWeekFromIso,
  type Course,
  type SemesterSettings,
  type TimetableEvent,
  type TimetableEventType,
  type TimetableRepeat,
} from '@studyspace/shared';
import type { CoursePayload, EventPayload } from '../../../api/planner';
import { useToastStore } from '../../../stores/useToastStore';
import { Button, IconButton, Input, Modal, Select } from '../../ui';

const COURSE_COLORS = [
  '#3A6BB5',
  '#3F7358',
  '#A36818',
  '#6E5AA8',
  '#B53D47',
  '#2D7D8C',
];

const DAY_OPTIONS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' },
];

export interface EventEditorModalProps {
  open: boolean;
  onClose: () => void;
  courses: Course[];
  existingEvents: TimetableEvent[];
  editingEvent: TimetableEvent | null;
  initialSlot: { dateIso: string; start: string; end: string } | null;
  onSave: (payload: EventPayload, eventId?: string) => Promise<void>;
  onDelete: (ev: TimetableEvent) => Promise<void>;
}

export function EventEditorModal({
  open,
  onClose,
  courses,
  existingEvents,
  editingEvent,
  initialSlot,
  onSave,
  onDelete,
}: EventEditorModalProps) {
  const defaultDate = initialSlot?.dateIso ?? editingEvent?.date ?? '2026-11-26';
  const [title, setTitle] = useState(editingEvent?.title ?? '');
  const [courseId, setCourseId] = useState<string>(editingEvent?.courseId ?? '');
  const [type, setType] = useState<TimetableEventType>(editingEvent?.type ?? 'class');
  const [repeat, setRepeat] = useState<TimetableRepeat>(editingEvent?.repeat ?? 'weekly');
  const [dayOfWeek, setDayOfWeek] = useState<number>(
    editingEvent?.dayOfWeek ?? getDayOfWeekFromIso(defaultDate)
  );
  const [date, setDate] = useState<string>(editingEvent?.date ?? defaultDate);
  const [start, setStart] = useState<string>(editingEvent?.start ?? initialSlot?.start ?? '09:00');
  const [end, setEnd] = useState<string>(editingEvent?.end ?? initialSlot?.end ?? '10:00');
  const [location, setLocation] = useState<string>(editingEvent?.location ?? '');
  const [notes, setNotes] = useState<string>(editingEvent?.notes ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const conflicts = findConflictsForDraft(
    {
      id: editingEvent?.id,
      dayOfWeek: repeat === 'none' ? getDayOfWeekFromIso(date) : dayOfWeek,
      date: repeat === 'none' ? date : null,
      repeat,
      start,
      end,
    },
    existingEvents
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (end <= start) {
      setError('End time must be after start time.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(
        {
          courseId: courseId || null,
          title: title.trim(),
          type,
          dayOfWeek: repeat === 'none' ? getDayOfWeekFromIso(date) : dayOfWeek,
          start,
          end,
          location: location.trim(),
          repeat,
          date: repeat === 'none' ? date : null,
          notes: notes.trim(),
        },
        editingEvent?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editingEvent ? 'Edit event' : 'Add event'}>
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
        <Input
          label="Title *"
          placeholder="e.g. CS 201 Lecture"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Course"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            options={[
              { value: '', label: 'Personal / None' },
              ...courses.map((c) => ({
                value: c.id,
                label: c.code ? `${c.code} · ${c.name}` : c.name,
              })),
            ]}
          />
          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as TimetableEventType)}
            options={[
              { value: 'class', label: 'Class' },
              { value: 'exam', label: 'Exam' },
              { value: 'deadline', label: 'Deadline' },
              { value: 'personal', label: 'Personal' },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Repeat"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value as TimetableRepeat)}
            options={[
              { value: 'weekly', label: 'Weekly (semester)' },
              { value: 'none', label: 'One-off date' },
            ]}
          />
          {repeat === 'weekly' ? (
            <Select
              label="Day"
              value={String(dayOfWeek)}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              options={DAY_OPTIONS}
            />
          ) : (
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Start"
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <Input label="End" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>

        <Input
          label="Location"
          placeholder="Room or building"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <Input
          label="Notes"
          placeholder="Optional details"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {conflicts.length > 0 && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--warning)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--warning)]"
          >
            <AlertTriangle size={15} strokeWidth={1.75} className="shrink-0" />
            <span>
              Overlaps with {conflicts.map((c) => `${c.title} (${c.start}–${c.end})`).join(', ')}
            </span>
          </div>
        )}

        {error && (
          <span role="alert" className="text-xs text-[var(--danger)]">
            {error}
          </span>
        )}

        <div className="flex items-center justify-between pt-2">
          {editingEvent ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void onDelete(editingEvent);
                onClose();
              }}
            >
              <Trash2 size={14} strokeWidth={1.5} />
              Delete
            </Button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editingEvent ? 'Save' : 'Create'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export interface CoursesModalProps {
  open: boolean;
  onClose: () => void;
  courses: Course[];
  onCreate: (payload: CoursePayload) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function CoursesModal({ open, onClose, courses, onCreate, onDelete }: CoursesModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState(COURSE_COLORS[0]!);
  const [instructor, setInstructor] = useState('');
  const [room, setRoom] = useState('');

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreate({
      name: name.trim(),
      code: code.trim(),
      color,
      instructor: instructor.trim(),
      room: room.trim(),
    });
    setName('');
    setCode('');
    setInstructor('');
    setRoom('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Courses">
      <div className="flex flex-col gap-4">
        <form onSubmit={(e) => void handleAdd(e)} className="flex flex-col gap-2.5">
          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Code"
              placeholder="CS 201"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <div className="col-span-2">
              <Input
                label="Course name *"
                placeholder="Data Structures"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Instructor"
              placeholder="Prof. Vance"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
            />
            <Input
              label="Default room"
              placeholder="Gates 104"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Course color">
              {COURSE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  aria-label={`Color ${c}`}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`h-7 w-7 cursor-pointer rounded-full border-2 transition-transform ${
                    color === c
                      ? 'scale-110 border-[var(--text)]'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
            <Button type="submit" size="sm">
              <Plus size={14} strokeWidth={1.5} />
              Add course
            </Button>
          </div>
        </form>

        <ul className="flex max-h-48 flex-col gap-1.5 overflow-y-auto border-t border-[var(--border)] pt-3">
          {courses.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-[var(--text)]">
                    {c.code ? `${c.code} · ${c.name}` : c.name}
                  </div>
                  {(c.instructor || c.room) && (
                    <div className="truncate text-xs text-[var(--text-muted)]">
                      {[c.instructor, c.room].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </div>
              <IconButton label={`Delete ${c.name}`} onClick={() => void onDelete(c.id)}>
                <Trash2 size={15} strokeWidth={1.5} />
              </IconButton>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

export interface SemesterSettingsModalProps {
  open: boolean;
  onClose: () => void;
  semester: SemesterSettings;
  onUpdateSemester: (patch: Partial<SemesterSettings>) => void;
  onImportIcs: (ics: string) => Promise<void>;
  onExportIcs: () => Promise<void>;
}

export function SemesterSettingsModal({
  open,
  onClose,
  semester,
  onUpdateSemester,
  onImportIcs,
  onExportIcs,
}: SemesterSettingsModalProps) {
  const pushToast = useToastStore((s) => s.push);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    await onImportIcs(text);
  };

  const handleLeadChange = async (raw: string) => {
    const num = Number(raw);
    if (!num) {
      onUpdateSemester({ notifyMinutesBefore: null });
      return;
    }
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        pushToast('Browser notification permission was not granted.', 'warning');
      }
    }
    onUpdateSemester({ notifyMinutesBefore: num });
  };

  return (
    <Modal open={open} onClose={onClose} title="Semester & ICS">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Semester start"
            type="date"
            value={semester.startDate}
            onChange={(e) => onUpdateSemester({ startDate: e.target.value })}
          />
          <Input
            label="Semester end"
            type="date"
            value={semester.endDate}
            onChange={(e) => onUpdateSemester({ endDate: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Select
            label="Week starts"
            value={semester.weekStart}
            onChange={(e) =>
              onUpdateSemester({ weekStart: e.target.value as 'mon' | 'sun' })
            }
            options={[
              { value: 'mon', label: 'Monday' },
              { value: 'sun', label: 'Sunday' },
            ]}
          />
          <Input
            label="From hour"
            type="number"
            min={0}
            max={20}
            value={semester.startHour}
            onChange={(e) =>
              onUpdateSemester({
                startHour: Math.min(20, Math.max(0, Number(e.target.value) || 0)),
              })
            }
          />
          <Input
            label="To hour"
            type="number"
            min={4}
            max={24}
            value={semester.endHour}
            onChange={(e) =>
              onUpdateSemester({
                endHour: Math.min(24, Math.max(4, Number(e.target.value) || 21)),
              })
            }
          />
        </div>

        <Select
          label="Notify before class"
          value={String(semester.notifyMinutesBefore ?? 0)}
          onChange={(e) => void handleLeadChange(e.target.value)}
          options={[
            { value: '0', label: 'Off' },
            { value: '5', label: '5 minutes before' },
            { value: '10', label: '10 minutes before' },
            { value: '15', label: '15 minutes before' },
            { value: '30', label: '30 minutes before' },
          ]}
        />

        <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3">
          <input
            ref={fileRef}
            type="file"
            accept=".ics,text/calendar"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload size={15} strokeWidth={1.5} />
            Import .ics
          </Button>
          <Button variant="outline" onClick={() => void onExportIcs()}>
            <Download size={15} strokeWidth={1.5} />
            Export .ics
          </Button>
        </div>
      </div>
    </Modal>
  );
}
