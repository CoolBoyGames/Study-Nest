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
  Sun,
  Timer,
} from 'lucide-react';
import type { WidgetId } from '@studyspace/shared';
import { Z_DOCK } from '../../constants/zIndex';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { IconButton, Tooltip } from '../ui';

interface DockItem {
  id: WidgetId;
  label: string;
  icon: typeof Clock;
}

const DOCK_ITEMS: DockItem[] = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'clock', label: 'Clock', icon: Clock },
  { id: 'pomodoro', label: 'Pomodoro Timer', icon: Timer },
  { id: 'timetable', label: 'Timetable', icon: CalendarDays },
  { id: 'vocab', label: 'Vocabulary SRS', icon: BookOpen },
  { id: 'todos', label: 'Daily To-Do', icon: CheckSquare },
  { id: 'notes', label: 'Scratchpad Notes', icon: FileText },
  { id: 'analytics', label: 'Study Analytics', icon: BarChart3 },
  { id: 'ambient', label: 'Ambient Sounds', icon: CloudRain },
  { id: 'spotify', label: 'Spotify', icon: Music },
  { id: 'appearance', label: 'Themes & Background', icon: Palette },
];

export interface BottomDockProps {
  isMobile: boolean;
  onOpenShortcuts: () => void;
}

export function BottomDock({ isMobile, onOpenShortcuts }: BottomDockProps) {
  const widgets = useSettingsStore((s) => s.widgets);
  const activeMobileWidget = useSettingsStore((s) => s.activeMobileWidget);
  const focusMode = useSettingsStore((s) => s.focusMode);
  const toggleWidget = useSettingsStore((s) => s.toggleWidget);
  const setWidgetVisible = useSettingsStore((s) => s.setWidgetVisible);
  const setActiveMobileWidget = useSettingsStore((s) => s.setActiveMobileWidget);
  const resetLayout = useSettingsStore((s) => s.resetLayout);
  const toggleFocusMode = useSettingsStore((s) => s.toggleFocusMode);

  if (focusMode) return null;

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
      aria-label="Study widgets dock"
      style={{ zIndex: Z_DOCK }}
      className="glass-panel fixed bottom-4 left-1/2 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-[var(--radius-lg)] px-3 py-2"
    >
      {DOCK_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = isMobile
          ? activeMobileWidget === item.id && widgets[item.id].visible
          : widgets[item.id].visible;

        return (
          <Tooltip key={item.id} label={item.label}>
            <IconButton
              label={item.label}
              active={isActive}
              onClick={() => handleItemClick(item.id)}
            >
              <Icon size={20} strokeWidth={1.5} />
            </IconButton>
          </Tooltip>
        );
      })}

      <div aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-[var(--border)]" />

      <Tooltip label="Focus mode (F)">
        <IconButton label="Focus mode" onClick={toggleFocusMode}>
          <Focus size={18} strokeWidth={1.5} />
        </IconButton>
      </Tooltip>

      <Tooltip label="Shortcuts & Focus settings (?)">
        <IconButton label="Keyboard shortcuts" onClick={onOpenShortcuts}>
          <HelpCircle size={18} strokeWidth={1.5} />
        </IconButton>
      </Tooltip>

      {!isMobile && (
        <Tooltip label="Reset widget layout">
          <IconButton label="Reset widget layout" onClick={resetLayout}>
            <RotateCcw size={18} strokeWidth={1.5} />
          </IconButton>
        </Tooltip>
      )}
    </nav>
  );
}
