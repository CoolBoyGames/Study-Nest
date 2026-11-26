import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { EyeOff, Settings2 } from 'lucide-react';
import type { WidgetId } from '@studyspace/shared';
import { Z_DOCK, Z_WIDGET } from './constants/zIndex';
import { resolveEffectiveTheme } from './constants/themes';
import { useT } from './i18n';
import { BackgroundLayer } from './components/study/BackgroundLayer';
import { BottomDock } from './components/study/BottomDock';
import { OptionsModal } from './components/study/OptionsModal';
import { ShortcutHelpModal } from './components/study/ShortcutHelpModal';
import { WidgetWindow } from './components/study/WidgetWindow';
import { Button, Skeleton, ToastContainer } from './components/ui';
import { AmbientSoundsWidget } from './components/widgets/AmbientSoundsWidget';
import { AppearanceWidget } from './components/widgets/AppearanceWidget';
import { ClockWidget } from './components/widgets/ClockWidget';
import { NotesWidget } from './components/widgets/NotesWidget';
import { PomodoroWidget } from './components/widgets/PomodoroWidget';
import { TodayWidget } from './components/widgets/TodayWidget';
import { TodosWidget } from './components/widgets/TodosWidget';
import { useSettingsStore } from './stores/useSettingsStore';

const SpotifyWidget = lazy(() => import('./components/widgets/SpotifyWidget'));
const VocabWidget = lazy(() => import('./components/widgets/VocabWidget'));
const AnalyticsWidget = lazy(() => import('./components/widgets/AnalyticsWidget'));
const TimetableWidget = lazy(() => import('./components/widgets/TimetableWidget'));

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
  const { t } = useT();
  const locale = useSettingsStore((s) => s.locale);
  const theme = useSettingsStore((s) => s.theme);
  const accent = useSettingsStore((s) => s.accent);
  const animationLevel = useSettingsStore((s) => s.animationLevel);
  const widgets = useSettingsStore((s) => s.widgets);
  const activeMobileWidget = useSettingsStore((s) => s.activeMobileWidget);
  const focusMode = useSettingsStore((s) => s.focusMode);
  const focusWidgetIds = useSettingsStore((s) => s.focusWidgetIds);
  const toggleFocusMode = useSettingsStore((s) => s.toggleFocusMode);
  const setFocusMode = useSettingsStore((s) => s.setFocusMode);
  const toggleWidget = useSettingsStore((s) => s.toggleWidget);

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() =>
    typeof window !== 'undefined' ? getLayoutMode(window.innerWidth) : 'free'
  );

  // Sync theme token (resolving 'auto' by time of day), accent, motion, and language on :root
  useLayoutEffect(() => {
    const apply = () => {
      document.documentElement.setAttribute('data-theme', resolveEffectiveTheme(theme));
    };
    apply();
    if (theme !== 'auto') return;
    const timer = window.setInterval(apply, 60_000);
    return () => window.clearInterval(timer);
  }, [theme]);

  useLayoutEffect(() => {
    if (accent && accent !== 'default') {
      document.documentElement.setAttribute('data-accent', accent);
    } else {
      document.documentElement.removeAttribute('data-accent');
    }
  }, [accent]);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-motion', animationLevel);
  }, [animationLevel]);

  useLayoutEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

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
        if (optionsOpen) {
          setOptionsOpen(false);
          return;
        }
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

      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key === ',') {
        e.preventDefault();
        setOptionsOpen((prev) => !prev);
        return;
      }

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

      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 't') {
        if (!document.querySelector('[role="dialog"]')) {
          e.preventDefault();
          toggleWidget('timetable');
        }
        return;
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'k') {
        if (!document.querySelector('[role="dialog"]')) {
          e.preventDefault();
          toggleWidget('todos');
        }
        return;
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'n') {
        if (!document.querySelector('[role="dialog"]')) {
          e.preventDefault();
          toggleWidget('notes');
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
  }, [focusMode, optionsOpen, setFocusMode, shortcutsOpen, toggleFocusMode, toggleWidget]);

  const renderWidgetContent = (id: WidgetId) => {
    switch (id) {
      case 'today':
        return <TodayWidget />;
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
      case 'timetable':
        return (
          <Suspense fallback={<Skeleton className="h-72 w-full" />}>
            <TimetableWidget />
          </Suspense>
        );
    }
  };

  const widgetDefs: { id: WidgetId; title: string }[] = [
    { id: 'today', title: t('widget.today') },
    { id: 'clock', title: t('widget.clock') },
    { id: 'pomodoro', title: t('widget.pomodoro') },
    { id: 'timetable', title: t('widget.timetable') },
    { id: 'vocab', title: t('widget.vocab') },
    { id: 'todos', title: t('widget.todos') },
    { id: 'notes', title: t('widget.notes') },
    { id: 'analytics', title: t('widget.analytics') },
    { id: 'ambient', title: t('widget.ambient') },
    { id: 'spotify', title: t('widget.spotify') },
    { id: 'appearance', title: t('widget.appearance') },
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
        aria-label={t('workspace.aria')}
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
              {t('workspace.emptyHint')}
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
        onOpenOptions={() => setOptionsOpen(true)}
      />

      {focusMode && (
        <div
          style={{ zIndex: Z_DOCK }}
          className="glass-panel animate-fade-in fixed bottom-4 right-4 flex items-center gap-1.5 rounded-[var(--radius-lg)] px-3 py-1.5"
        >
          <Button variant="ghost" size="sm" onClick={() => setShortcutsOpen(true)}>
            <Settings2 size={15} strokeWidth={1.5} />
            {t('focus.widgetsBtn')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFocusMode(false)}>
            <EyeOff size={15} strokeWidth={1.5} />
            {t('focus.exitBtn')}
          </Button>
        </div>
      )}

      <OptionsModal open={optionsOpen} onClose={() => setOptionsOpen(false)} />
      <ShortcutHelpModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ToastContainer />
    </div>
  );
}

export default App;
