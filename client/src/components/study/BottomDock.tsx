import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  Clock,
  CloudRain,
  FileText,
  Focus,
  HelpCircle,
  Music,
  Palette,
  RotateCcw,
  Settings,
  Sun,
  Timer,
} from 'lucide-react';
import type { WidgetId } from '@studyspace/shared';
import { Z_DOCK } from '../../constants/zIndex';
import { useT } from '../../i18n';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { IconButton, Tooltip } from '../ui';

interface DockItem {
  id: WidgetId;
  icon: typeof Clock;
}

const DOCK_ITEMS: DockItem[] = [
  { id: 'today', icon: Sun },
  { id: 'clock', icon: Clock },
  { id: 'pomodoro', icon: Timer },
  { id: 'timetable', icon: CalendarDays },
  { id: 'vocab', icon: BookOpen },
  { id: 'todos', icon: CheckSquare },
  { id: 'notes', icon: FileText },
  { id: 'analytics', icon: BarChart3 },
  { id: 'ambient', icon: CloudRain },
  { id: 'spotify', icon: Music },
  { id: 'appearance', icon: Palette },
];

export interface BottomDockProps {
  isMobile: boolean;
  onOpenShortcuts: () => void;
  onOpenOptions: () => void;
}

export function BottomDock({ isMobile, onOpenShortcuts, onOpenOptions }: BottomDockProps) {
  const { t } = useT();
  const widgets = useSettingsStore((s) => s.widgets);
  const activeMobileWidget = useSettingsStore((s) => s.activeMobileWidget);
  const focusMode = useSettingsStore((s) => s.focusMode);
  const toggleWidget = useSettingsStore((s) => s.toggleWidget);
  const setWidgetVisible = useSettingsStore((s) => s.setWidgetVisible);
  const setActiveMobileWidget = useSettingsStore((s) => s.setActiveMobileWidget);
  const resetLayout = useSettingsStore((s) => s.resetLayout);
  const toggleFocusMode = useSettingsStore((s) => s.toggleFocusMode);

  if (focusMode) return null;

  const dockLabels: Record<WidgetId, string> = {
    today: t('dock.today'),
    clock: t('dock.clock'),
    pomodoro: t('dock.pomodoro'),
    timetable: t('dock.timetable'),
    vocab: t('dock.vocab'),
    todos: t('dock.todos'),
    notes: t('dock.notes'),
    analytics: t('dock.analytics'),
    ambient: t('dock.ambient'),
    spotify: t('dock.spotify'),
    appearance: t('dock.appearance'),
  };

  const handleItemClick = (id: WidgetId) => {
    if (isMobile) {
      if (activeMobileWidget === id && widgets[id].visible) {
        setActiveMobileWidget(null);
        setWidgetVisible(id, false);
      } else {
        setWidgetVisible(id, true);
        setActiveMobileWidget(id);
      }
      return;
    }
    toggleWidget(id);
  };

  return (
    <nav
      aria-label={t('dock.aria')}
      style={{ zIndex: Z_DOCK }}
      className="glass-panel fixed bottom-4 left-1/2 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-[var(--radius-lg)] px-3 py-2"
    >
      {DOCK_ITEMS.map((item, idx) => {
        const Icon = item.icon;
        const label = dockLabels[item.id];
        const isActive = isMobile
          ? activeMobileWidget === item.id && widgets[item.id].visible
          : widgets[item.id].visible;

        return (
          <Tooltip key={item.id} label={label}>
            <div
              style={{ ['--dock-idx' as string]: idx }}
              className="dock-item-reveal"
            >
              <IconButton
                label={label}
                active={isActive}
                onClick={() => handleItemClick(item.id)}
              >
                <Icon size={20} strokeWidth={1.5} />
              </IconButton>
            </div>
          </Tooltip>
        );
      })}

      <div aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-[var(--border)]" />

      <Tooltip label={t('dock.options')}>
        <IconButton label={t('options.title')} onClick={onOpenOptions}>
          <Settings size={18} strokeWidth={1.5} />
        </IconButton>
      </Tooltip>

      <Tooltip label={t('dock.focusMode')}>
        <IconButton label={t('dock.focusModeLabel')} onClick={toggleFocusMode}>
          <Focus size={18} strokeWidth={1.5} />
        </IconButton>
      </Tooltip>

      <Tooltip label={t('dock.shortcuts')}>
        <IconButton label={t('dock.shortcutsLabel')} onClick={onOpenShortcuts}>
          <HelpCircle size={18} strokeWidth={1.5} />
        </IconButton>
      </Tooltip>

      {!isMobile && (
        <Tooltip label={t('dock.resetLayout')}>
          <IconButton label={t('dock.resetLayout')} onClick={resetLayout}>
            <RotateCcw size={18} strokeWidth={1.5} />
          </IconButton>
        </Tooltip>
      )}
    </nav>
  );
}
