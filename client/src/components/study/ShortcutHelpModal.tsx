import type { WidgetId } from '@studyspace/shared';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { Modal } from '../ui';

export interface ShortcutHelpModalProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: Array<{ keys: string; description: string }> = [
  { keys: '?', description: 'Open or close keyboard shortcuts' },
  { keys: 'F', description: 'Toggle Focus Mode (hide dock & distractions)' },
  { keys: 'T', description: 'Toggle Timetable widget' },
  { keys: 'K', description: 'Toggle Tasks widget' },
  { keys: 'N', description: 'Toggle Notes widget' },
  { keys: 'Esc', description: 'Close dialog or exit Focus Mode' },
  { keys: 'Space', description: 'Flip current vocabulary card (Review tab)' },
  { keys: '1 – 4', description: 'Rate card: Again / Hard / Good / Easy' },
  { keys: 'Alt + 1..9', description: 'Toggle widgets (Clock, Timer, Vocab, To-Do, Notes, Stats, Ambient, Spotify, Themes)' },
];

const FOCUS_WIDGET_OPTIONS: Array<{ id: WidgetId; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'clock', label: 'Clock' },
  { id: 'pomodoro', label: 'Focus Timer' },
  { id: 'timetable', label: 'Timetable' },
  { id: 'vocab', label: 'Vocabulary SRS' },
  { id: 'todos', label: 'Daily To-Do' },
  { id: 'notes', label: 'Scratchpad Notes' },
  { id: 'analytics', label: 'Study Analytics' },
  { id: 'ambient', label: 'Ambient Sounds' },
  { id: 'spotify', label: 'Spotify' },
];

export function ShortcutHelpModal({ open, onClose }: ShortcutHelpModalProps) {
  const focusWidgetIds = useSettingsStore((s) => s.focusWidgetIds);
  const toggleFocusWidget = useSettingsStore((s) => s.toggleFocusWidget);

  return (
    <Modal open={open} onClose={onClose} title="Shortcuts & Focus Mode">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Keyboard shortcuts
          </h3>
          <ul className="flex flex-col gap-1.5">
            {SHORTCUTS.map((item) => (
              <li
                key={item.keys}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                <span className="text-[var(--text)]">{item.description}</span>
                <kbd className="shrink-0 rounded border border-[var(--border-control)] bg-[var(--bg)] px-2 py-0.5 font-mono text-xs text-[var(--text)]">
                  {item.keys}
                </kbd>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Widgets kept visible in Focus Mode
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {FOCUS_WIDGET_OPTIONS.map((opt) => {
              const selected = focusWidgetIds.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  onClick={() => toggleFocusWidget(opt.id)}
                  className={`flex min-h-10 cursor-pointer items-center justify-between rounded-[var(--radius-sm)] border px-3 text-xs font-medium transition-colors ${
                    selected
                      ? 'border-[var(--primary)] bg-[var(--surface-hover)] text-[var(--text)]'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span>{selected ? 'Shown' : 'Hidden'}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
