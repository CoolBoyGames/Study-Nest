import type { WidgetId } from '@studyspace/shared';
import { useT } from '../../i18n';
import { useSettingsStore } from '../../stores/useSettingsStore';

const FOCUS_WIDGET_IDS: WidgetId[] = [
  'today',
  'clock',
  'pomodoro',
  'timetable',
  'vocab',
  'todos',
  'notes',
  'analytics',
  'ambient',
  'spotify',
];

export function ShortcutsSection() {
  const { t } = useT();
  const focusWidgetIds = useSettingsStore((s) => s.focusWidgetIds);
  const toggleFocusWidget = useSettingsStore((s) => s.toggleFocusWidget);

  const shortcuts: Array<{ keys: string; description: string }> = [
    { keys: ',', description: t('shortcuts.desc.options') },
    { keys: '?', description: t('shortcuts.desc.help') },
    { keys: 'F', description: t('shortcuts.desc.focus') },
    { keys: 'T', description: t('shortcuts.desc.timetable') },
    { keys: 'K', description: t('shortcuts.desc.tasks') },
    { keys: 'N', description: t('shortcuts.desc.notes') },
    { keys: 'Esc', description: t('shortcuts.desc.esc') },
    { keys: 'Space', description: t('shortcuts.desc.space') },
    { keys: '1 – 4', description: t('shortcuts.desc.rate') },
    { keys: 'Arrows / Shift+Arrows', description: t('shortcuts.desc.resize') },
    { keys: 'Alt + 1..9', description: t('shortcuts.desc.alt') },
  ];

  const widgetLabels: Record<WidgetId, string> = {
    today: t('widget.today'),
    clock: t('widget.clock'),
    pomodoro: t('widget.pomodoro'),
    timetable: t('widget.timetable'),
    vocab: t('widget.vocab'),
    todos: t('widget.todos'),
    notes: t('widget.notes'),
    analytics: t('widget.analytics'),
    ambient: t('widget.ambient'),
    spotify: t('widget.spotify'),
    appearance: t('widget.appearance'),
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {t('shortcuts.heading')}
        </h3>
        <ul className="flex flex-col gap-1.5">
          {shortcuts.map((item) => (
            <li
              key={item.keys}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              <span className="min-w-0 text-[var(--text)]">{item.description}</span>
              <kbd className="shrink-0 rounded border border-[var(--border-control)] bg-[var(--bg)] px-2 py-0.5 font-mono text-xs text-[var(--text)]">
                {item.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {t('shortcuts.focusHeading')}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {FOCUS_WIDGET_IDS.map((id) => {
            const selected = focusWidgetIds.includes(id);
            return (
              <button
                key={id}
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => toggleFocusWidget(id)}
                className={`flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-sm)] border px-3 text-xs font-medium transition-colors ${
                  selected
                    ? 'border-[var(--primary)] bg-[var(--surface-hover)] text-[var(--text)]'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <span className="truncate">{widgetLabels[id]}</span>
                <span className="shrink-0">{selected ? t('shortcuts.shown') : t('shortcuts.hidden')}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
