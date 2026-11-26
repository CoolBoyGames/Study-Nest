import { create } from 'zustand';
import type {
  AmbientChannelId,
  AmbientSettings,
  BackgroundConfig,
  ClockSettings,
  PomodoroSettings,
  SemesterSettings,
  ThemeId,
  WidgetId,
  WidgetLayout,
} from '@studyspace/shared';
import { useToastStore } from './useToastStore';

const STORAGE_KEY = 'studynest:settings:v1';

interface PersistedSettings {
  version: 1;
  theme: ThemeId;
  background: BackgroundConfig;
  clock: ClockSettings;
  pomodoro: PomodoroSettings;
  spotifyUrl: string;
  ambientVolumes: Record<AmbientChannelId, number>;
  widgets: Record<WidgetId, WidgetLayout>;
  focusWidgetIds: WidgetId[];
  semester: SemesterSettings;
}

const DEFAULT_WIDGETS: Record<WidgetId, WidgetLayout> = {
  today: { id: 'today', visible: false, minimized: false, x: 384, y: 32, width: 360, zIndex: 21 },
  clock: { id: 'clock', visible: true, minimized: false, x: 32, y: 32, width: 280, zIndex: 11 },
  pomodoro: {
    id: 'pomodoro',
    visible: true,
    minimized: false,
    x: 32,
    y: 232,
    width: 320,
    zIndex: 12,
  },
  ambient: {
    id: 'ambient',
    visible: false,
    minimized: false,
    x: 384,
    y: 32,
    width: 320,
    zIndex: 13,
  },
  spotify: {
    id: 'spotify',
    visible: false,
    minimized: false,
    x: 384,
    y: 320,
    width: 344,
    zIndex: 14,
  },
  appearance: {
    id: 'appearance',
    visible: false,
    minimized: false,
    x: 752,
    y: 32,
    width: 360,
    zIndex: 15,
  },
  vocab: {
    id: 'vocab',
    visible: false,
    minimized: false,
    x: 744,
    y: 32,
    width: 440,
    zIndex: 16,
  },
  todos: {
    id: 'todos',
    visible: false,
    minimized: false,
    x: 384,
    y: 32,
    width: 344,
    zIndex: 17,
  },
  notes: {
    id: 'notes',
    visible: false,
    minimized: false,
    x: 384,
    y: 360,
    width: 580,
    zIndex: 18,
  },
  analytics: {
    id: 'analytics',
    visible: false,
    minimized: false,
    x: 760,
    y: 32,
    width: 424,
    zIndex: 19,
  },
  timetable: {
    id: 'timetable',
    visible: false,
    minimized: false,
    x: 368,
    y: 32,
    width: 680,
    zIndex: 20,
  },
};

const DEFAULT_PERSISTED: PersistedSettings = {
  version: 1,
  theme: 'mild-blue',
  background: {
    kind: 'gradient',
    presetId: 'morning-mist',
    imageUrl: '',
    videoUrl: '',
    blurPx: 0,
    dimPercent: 0,
  },
  clock: {
    mode: 'digital',
    hourFormat: '24h',
    showDate: true,
  },
  pomodoro: {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    cyclesBeforeLongBreak: 4,
    autoCycle: true,
    soundEnabled: true,
    notificationsEnabled: false,
  },
  spotifyUrl: '',
  ambientVolumes: {
    rain: 0.5,
    cafe: 0.4,
    'white-noise': 0.35,
  },
  widgets: DEFAULT_WIDGETS,
  focusWidgetIds: ['clock', 'pomodoro'],
  semester: {
    startDate: '2026-08-24',
    endDate: '2026-12-20',
    weekStart: 'mon',
    startHour: 8,
    endHour: 21,
    notifyMinutesBefore: 10,
  },
};

function loadPersisted(): PersistedSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PERSISTED;
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
    if (parsed.version !== 1) return DEFAULT_PERSISTED;

    return {
      version: 1,
      theme: parsed.theme ?? DEFAULT_PERSISTED.theme,
      background: { ...DEFAULT_PERSISTED.background, ...parsed.background },
      clock: { ...DEFAULT_PERSISTED.clock, ...parsed.clock },
      pomodoro: { ...DEFAULT_PERSISTED.pomodoro, ...parsed.pomodoro },
      spotifyUrl: typeof parsed.spotifyUrl === 'string' ? parsed.spotifyUrl : '',
      ambientVolumes: { ...DEFAULT_PERSISTED.ambientVolumes, ...parsed.ambientVolumes },
      widgets: {
        today: { ...DEFAULT_WIDGETS.today, ...parsed.widgets?.today },
        clock: { ...DEFAULT_WIDGETS.clock, ...parsed.widgets?.clock },
        pomodoro: { ...DEFAULT_WIDGETS.pomodoro, ...parsed.widgets?.pomodoro },
        ambient: { ...DEFAULT_WIDGETS.ambient, ...parsed.widgets?.ambient },
        spotify: { ...DEFAULT_WIDGETS.spotify, ...parsed.widgets?.spotify },
        appearance: { ...DEFAULT_WIDGETS.appearance, ...parsed.widgets?.appearance },
        vocab: { ...DEFAULT_WIDGETS.vocab, ...parsed.widgets?.vocab },
        todos: { ...DEFAULT_WIDGETS.todos, ...parsed.widgets?.todos },
        notes: { ...DEFAULT_WIDGETS.notes, ...parsed.widgets?.notes },
        analytics: { ...DEFAULT_WIDGETS.analytics, ...parsed.widgets?.analytics },
        timetable: { ...DEFAULT_WIDGETS.timetable, ...parsed.widgets?.timetable },
      },
      focusWidgetIds:
        Array.isArray(parsed.focusWidgetIds) && parsed.focusWidgetIds.length > 0
          ? parsed.focusWidgetIds
          : DEFAULT_PERSISTED.focusWidgetIds,
      semester: { ...DEFAULT_PERSISTED.semester, ...parsed.semester },
    };
  } catch {
    return DEFAULT_PERSISTED;
  }
}

let persistTimer: number | undefined;

function schedulePersist(state: SettingsStore): void {
  if (typeof window === 'undefined') return;
  if (persistTimer !== undefined) {
    window.clearTimeout(persistTimer);
  }
  persistTimer = window.setTimeout(() => {
    const payload: PersistedSettings = {
      version: 1,
      theme: state.theme,
      background: state.background,
      clock: state.clock,
      pomodoro: state.pomodoro,
      spotifyUrl: state.spotifyUrl,
      ambientVolumes: {
        rain: state.ambient.rain.volume,
        cafe: state.ambient.cafe.volume,
        'white-noise': state.ambient['white-noise'].volume,
      },
      widgets: state.widgets,
      focusWidgetIds: state.focusWidgetIds,
      semester: state.semester,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      useToastStore
        .getState()
        .push('Could not save settings (browser storage full). Try a smaller background image.', 'warning');
    }
  }, 300);
}

interface SettingsStore {
  theme: ThemeId;
  background: BackgroundConfig;
  clock: ClockSettings;
  pomodoro: PomodoroSettings;
  spotifyUrl: string;
  ambient: AmbientSettings;
  widgets: Record<WidgetId, WidgetLayout>;
  activeMobileWidget: WidgetId | null;
  focusMode: boolean;
  focusWidgetIds: WidgetId[];
  semester: SemesterSettings;
  activeTask: { id: string; title: string } | null;
  vocabQuickAddDraft: { word: string; notes: string } | null;
  selectedCourseId: string;

  setTheme: (theme: ThemeId) => void;
  updateBackground: (patch: Partial<BackgroundConfig>) => void;
  updateClock: (patch: Partial<ClockSettings>) => void;
  updatePomodoro: (patch: Partial<PomodoroSettings>) => void;
  setSpotifyUrl: (url: string) => void;
  toggleAmbientChannel: (id: AmbientChannelId) => void;
  setAmbientVolume: (id: AmbientChannelId, volume: number) => void;
  toggleWidget: (id: WidgetId) => void;
  setWidgetVisible: (id: WidgetId, visible: boolean) => void;
  toggleMinimizeWidget: (id: WidgetId) => void;
  moveWidget: (id: WidgetId, x: number, y: number) => void;
  bringToFront: (id: WidgetId) => void;
  resetLayout: () => void;
  setActiveMobileWidget: (id: WidgetId | null) => void;
  toggleFocusMode: () => void;
  setFocusMode: (enabled: boolean) => void;
  toggleFocusWidget: (id: WidgetId) => void;
  updateSemester: (patch: Partial<SemesterSettings>) => void;
  setActiveTask: (task: { id: string; title: string } | null) => void;
  setVocabQuickAddDraft: (draft: { word: string; notes: string } | null) => void;
  setSelectedCourseId: (courseId: string) => void;
}

const initial = typeof window !== 'undefined' ? loadPersisted() : DEFAULT_PERSISTED;

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  theme: initial.theme,
  background: initial.background,
  clock: initial.clock,
  pomodoro: initial.pomodoro,
  spotifyUrl: initial.spotifyUrl,
  ambient: {
    rain: { playing: false, volume: initial.ambientVolumes.rain },
    cafe: { playing: false, volume: initial.ambientVolumes.cafe },
    'white-noise': { playing: false, volume: initial.ambientVolumes['white-noise'] },
  },
  widgets: initial.widgets,
  activeMobileWidget: 'clock',
  focusMode: false,
  focusWidgetIds: initial.focusWidgetIds,
  semester: initial.semester,
  activeTask: null,
  vocabQuickAddDraft: null,
  selectedCourseId: '',

  setTheme: (theme) => {
    set({ theme });
    schedulePersist(get());
  },

  updateBackground: (patch) => {
    set((s) => ({ background: { ...s.background, ...patch } }));
    schedulePersist(get());
  },

  updateClock: (patch) => {
    set((s) => ({ clock: { ...s.clock, ...patch } }));
    schedulePersist(get());
  },

  updatePomodoro: (patch) => {
    set((s) => ({ pomodoro: { ...s.pomodoro, ...patch } }));
    schedulePersist(get());
  },

  setSpotifyUrl: (spotifyUrl) => {
    set({ spotifyUrl });
    schedulePersist(get());
  },

  toggleAmbientChannel: (id) => {
    set((s) => ({
      ambient: {
        ...s.ambient,
        [id]: { ...s.ambient[id], playing: !s.ambient[id].playing },
      },
    }));
  },

  setAmbientVolume: (id, volume) => {
    const clamped = Math.min(1, Math.max(0, volume));
    set((s) => ({
      ambient: {
        ...s.ambient,
        [id]: { ...s.ambient[id], volume: clamped },
      },
    }));
    schedulePersist(get());
  },

  toggleWidget: (id) => {
    set((s) => {
      const current = s.widgets[id];
      const maxZ = Math.max(...Object.values(s.widgets).map((w) => w.zIndex));
      const nextVisible = !current.visible;
      return {
        widgets: {
          ...s.widgets,
          [id]: {
            ...current,
            visible: nextVisible,
            minimized: nextVisible ? false : current.minimized,
            zIndex: nextVisible ? maxZ + 1 : current.zIndex,
          },
        },
        activeMobileWidget: nextVisible ? id : s.activeMobileWidget === id ? null : s.activeMobileWidget,
      };
    });
    schedulePersist(get());
  },

  setWidgetVisible: (id, visible) => {
    set((s) => {
      const maxZ = Math.max(...Object.values(s.widgets).map((w) => w.zIndex));
      return {
        widgets: {
          ...s.widgets,
          [id]: {
            ...s.widgets[id],
            visible,
            minimized: visible ? false : s.widgets[id].minimized,
            zIndex: visible ? maxZ + 1 : s.widgets[id].zIndex,
          },
        },
        activeMobileWidget: visible ? id : s.activeMobileWidget === id ? null : s.activeMobileWidget,
      };
    });
    schedulePersist(get());
  },

  toggleMinimizeWidget: (id) => {
    set((s) => ({
      widgets: {
        ...s.widgets,
        [id]: { ...s.widgets[id], minimized: !s.widgets[id].minimized },
      },
    }));
    schedulePersist(get());
  },

  moveWidget: (id, x, y) => {
    set((s) => ({
      widgets: {
        ...s.widgets,
        [id]: { ...s.widgets[id], x, y },
      },
    }));
    schedulePersist(get());
  },

  bringToFront: (id) => {
    set((s) => {
      const maxZ = Math.max(...Object.values(s.widgets).map((w) => w.zIndex));
      if (s.widgets[id].zIndex === maxZ) return s;
      return {
        widgets: {
          ...s.widgets,
          [id]: { ...s.widgets[id], zIndex: maxZ + 1 },
        },
      };
    });
    schedulePersist(get());
  },

  resetLayout: () => {
    set({ widgets: DEFAULT_WIDGETS, activeMobileWidget: 'clock' });
    schedulePersist(get());
  },

  setActiveMobileWidget: (id) => set({ activeMobileWidget: id }),

  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),

  setFocusMode: (focusMode) => set({ focusMode }),

  toggleFocusWidget: (id) => {
    set((s) => {
      const exists = s.focusWidgetIds.includes(id);
      if (exists && s.focusWidgetIds.length === 1) {
        return s; // keep at least one widget in focus mode
      }
      const next = exists
        ? s.focusWidgetIds.filter((w) => w !== id)
        : [...s.focusWidgetIds, id];
      return { focusWidgetIds: next };
    });
    schedulePersist(get());
  },

  updateSemester: (patch) => {
    set((s) => ({ semester: { ...s.semester, ...patch } }));
    schedulePersist(get());
  },

  setActiveTask: (activeTask) => set({ activeTask }),

  setVocabQuickAddDraft: (vocabQuickAddDraft) => set({ vocabQuickAddDraft }),

  setSelectedCourseId: (selectedCourseId) => set({ selectedCourseId }),
}));
