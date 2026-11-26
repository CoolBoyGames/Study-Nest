import { lazy, Suspense, useEffect, useState } from 'react';
import { EyeOff, Settings2 } from 'lucide-react';
import type { WidgetId } from '@studyspace/shared';
import { Z_DOCK, Z_WIDGET } from './constants/zIndex';
import { BackgroundLayer } from './components/study/BackgroundLayer';
import { BottomDock } from './components/study/BottomDock';
import { ShortcutHelpModal } from './components/study/ShortcutHelpModal';
import { WidgetWindow } from './components/study/WidgetWindow';
import { Button, Skeleton, ToastContainer } from './components/ui';
import { AmbientSoundsWidget } from './components/widgets/AmbientSoundsWidget';
import { AppearanceWidget } from './components/widgets/AppearanceWidget';
import { ClockWidget } from './components/widgets/ClockWidget';
import { NotesWidget } from './components/widgets/NotesWidget';
import { PomodoroWidget } from './components/widgets/PomodoroWidget';
import { TodosWidget } from './components/widgets/TodosWidget';
import { useSettingsStore } from './stores/useSettingsStore';

const SpotifyWidget = lazy(() => import('./components/widgets/SpotifyWidget'));
const VocabWidget = lazy(() => import('./components/widgets/VocabWidget'));
const AnalyticsWidget = lazy(() => import('./components/widgets/AnalyticsWidget'));

type LayoutMode = 'free' | 'grid' | 'sheet';

function getLayoutMode(width: number): LayoutMode {
  if (width >= 1024) return 'free';
  if (width >= 640) return 'grid';
  return 'sheet';
}

const SHORTCUT_WIDGET_MAP: Record<string, WidgetId> = {
  '1': 'clock',
  '2': 'pomodoro',
  '3': 'vocab',
  '4': 'todos',
  '5': 'notes',
  '6': 'analytics',
  '7': 'ambient',
  '8': 'spotify',
  '9': 'appearance',
};

export function App() {
  const theme = useSettingsStore((s) => s.theme);
  const widgets = useSettingsStore((s) => s.widgets);
  const activeMobileWidget = useSettingsStore((s) => s.activeMobileWidget);
  const focusMode = useSettingsStore((s) => s.focusMode);
  const focusWidgetIds = useSettingsStore((s) => s.focusWidgetIds);
  const toggleFocusMode = useSettingsStore((s) => s.toggleFocusMode);
  const setFocusMode = useSettingsStore((s) => s.setFocusMode);
  const toggleWidget = useSettingsStore((s) => s.toggleWidget);

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() =>
    typeof window !== 'undefined' ? getLayoutMode(window.innerWidth) : 'free'
  );

  // Sync theme token attribute on :root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Responsive breakpoint listener
  useEffect(() => {
    const handleResize = () => {
      setLayoutMode(getLayoutMode(window.innerWidth));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global keyboard shortcuts (?, F, Esc, Alt+1..9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        if (shortcutsOpen) {
          setShortcutsOpen(false);
          return;
        }
        if (focusMode && !document.querySelector('[role="dialog"]')) {
          setFocusMode(false);
        }
        return;
      }

      if (inEditable) return;

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'f') {
        if (!document.querySelector('[role="dialog"]')) {
          e.preventDefault();
          toggleFocusMode();
        }
        return;
      }

      if (e.altKey && SHORTCUT_WIDGET_MAP[e.key]) {
        const wid = SHORTCUT_WIDGET_MAP[e.key];
        if (wid) {
          e.preventDefault();
          toggleWidget(wid);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode, setFocusMode, shortcutsOpen, toggleFocusMode, toggleWidget]);

  const renderWidgetContent = (id: WidgetId) => {
    switch (id) {
      case 'clock':
        return <ClockWidget />;
      case 'pomodoro':
        return <PomodoroWidget />;
      case 'vocab':
        return (
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <VocabWidget />
          </Suspense>
        );
      case 'todos':
        return <TodosWidget />;
      case 'notes':
        return <NotesWidget />;
      case 'analytics':
        return (
          <Suspense fallback={<Skeleton className="h-56 w-full" />}>
            <AnalyticsWidget />
          </Suspense>
        );
      case 'ambient':
        return <AmbientSoundsWidget />;
      case 'spotify':
        return (
          <Suspense fallback={<Skeleton className="h-44 w-full" />}>
            <SpotifyWidget />
          </Suspense>
        );
      case 'appearance':
        return <AppearanceWidget />;
    }
  };

  const widgetDefs: { id: WidgetId; title: string }[] = [
    { id: 'clock', title: 'Clock' },
    { id: 'pomodoro', title: 'Focus Timer' },
    { id: 'vocab', title: 'Vocabulary SRS' },
    { id: 'todos', title: 'Daily To-Do' },
    { id: 'notes', title: 'Scratchpad' },
    { id: 'analytics', title: 'Study Analytics' },
    { id: 'ambient', title: 'Ambient Sounds' },
    { id: 'spotify', title: 'Spotify' },
    { id: 'appearance', title: 'Appearance' },
  ];

  const displayedDefs = focusMode
    ? widgetDefs.filter((w) => focusWidgetIds.includes(w.id))
    : widgetDefs;

  const anyVisible = focusMode
    ? displayedDefs.length > 0
    : displayedDefs.some((w) => widgets[w.id].visible);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <BackgroundLayer />

      <main
        aria-label="StudyNest workspace"
        style={{ zIndex: Z_WIDGET }}
        className={
          layoutMode === 'free'
            ? 'relative h-full w-full'
            : layoutMode === 'grid'
              ? 'relative grid h-full w-full grid-cols-2 content-start gap-4 overflow-y-auto p-4 pb-24'
              : 'relative flex h-full w-full flex-col justify-end p-3 pb-24'
        }
      >
        {!anyVisible && (
          <div className="pointer-events-none flex h-full w-full items-center justify-center">
            <p className="glass-panel px-5 py-3 text-sm text-[var(--text-muted)]">
              Use the dock below to open your study widgets, or press ? for shortcuts.
            </p>
          </div>
        )}

        {displayedDefs.map(({ id, title }) => {
          if (layoutMode === 'sheet' && !focusMode && activeMobileWidget !== id) {
            return null;
          }
          if (layoutMode === 'sheet' && focusMode && id !== displayedDefs[0]?.id) {
            return null;
          }
          return (
            <WidgetWindow
              key={id}
              id={id}
              title={title}
              layoutMode={layoutMode}
              forceVisible={focusMode}
            >
              {renderWidgetContent(id)}
            </WidgetWindow>
          );
        })}
      </main>

      <BottomDock
        isMobile={layoutMode === 'sheet'}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      {focusMode && (
        <div
          style={{ zIndex: Z_DOCK }}
          className="glass-panel animate-fade-in fixed bottom-4 right-4 flex items-center gap-1.5 rounded-[var(--radius-lg)] px-3 py-1.5"
        >
          <Button variant="ghost" size="sm" onClick={() => setShortcutsOpen(true)}>
            <Settings2 size={15} strokeWidth={1.5} />
            Focus widgets
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFocusMode(false)}>
            <EyeOff size={15} strokeWidth={1.5} />
            Exit Focus (F)
          </Button>
        </div>
      )}

      <ShortcutHelpModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ToastContainer />
    </div>
  );
}

export default App;
