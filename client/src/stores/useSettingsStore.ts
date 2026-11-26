import { create } from 'zustand';
import type {
  AccentId,
  AmbientChannelId,
  AmbientSettings,
  AnimationLevel,
  BackgroundConfig,
  ClockSettings,
  LocaleId,
  PomodoroSettings,
  SemesterSettings,
  ThemeId,
  WidgetId,
  WidgetLayout,
} from '@studyspace/shared';
import {
  createDefaultWidgetsMap,
  WIDGET_REGISTRY,
} from '../constants/widgetRegistry';
import { validateWidgetLayout } from '../utils/geometry';
import { useToastStore } from './useToastStore';

export const SETTINGS_STORAGE_KEY = 'studynest:settings:v2';
export const LEGACY_SETTINGS_KEY_V1 = 'studynest:settings:v1';

export interface PersistedSettings {
  version: 2;
  locale: LocaleId;
  theme: ThemeId;
  accent: AccentId;
  animationLevel: AnimationLevel;
  background: BackgroundConfig;
  clock: ClockSettings;
  pomodoro: PomodoroSettings;
  spotifyUrl: string;
  ambientVolumes: Record<AmbientChannelId, number>;
  widgets: Record<WidgetId, WidgetLayout>;
  focusWidgetIds: WidgetId[];
  semester: SemesterSettings;
}

const DEFAULT_WIDGETS = createDefaultWidgetsMap();

function getDefaultAnimationLevel(): AnimationLevel {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) {
    return 'off';
  }
  return 'normal';
}

export const DEFAULT_PERSISTED_SETTINGS: PersistedSettings = {
  version: 2,
  locale: 'en',
  theme: 'mild-blue',
  accent: 'default',
  animationLevel: getDefaultAnimationLevel(),
  background: {
    kind: 'gradient',
    presetId: 'morning-mist',
    animatedId: 'aurora',
    animatedIntensity: 60,
    imageUrl: '',
    videoUrl: '',
    recentVideoSources: [],
    blurPx: 0,
    dimPercent: 0,
    brightnessPercent: 100,
    vignettePercent: 0,
    filmGrain: false,
    autoRotateMinutes: 0,
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

function validateAllWidgets(
  rawWidgets: Partial<Record<WidgetId, unknown>> | undefined,
  vw = typeof window !== 'undefined' ? window.innerWidth : 1280,
  vh = typeof window !== 'undefined' ? window.innerHeight : 800
): Record<WidgetId, WidgetLayout> {
  const ids = Object.keys(DEFAULT_WIDGETS) as WidgetId[];
  const result = {} as Record<WidgetId, WidgetLayout>;
  for (const id of ids) {
    result[id] = validateWidgetLayout(
      rawWidgets?.[id],
      DEFAULT_WIDGETS[id],
      WIDGET_REGISTRY[id],
      vw,
      vh
    );
  }
  return result;
}

export function migratePersistedSettings(
  raw: unknown,
  vw = typeof window !== 'undefined' ? window.innerWidth : 1280,
  vh = typeof window !== 'undefined' ? window.innerHeight : 800
): PersistedSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_PERSISTED_SETTINGS, widgets: validateAllWidgets(undefined, vw, vh) };
  }

  const parsed = raw as Partial<Record<string, unknown>>;
  if (parsed.version !== undefined && parsed.version !== 1 && parsed.version !== 2) {
    return { ...DEFAULT_PERSISTED_SETTINGS, widgets: validateAllWidgets(undefined, vw, vh) };
  }

  const locale: LocaleId = parsed.locale === 'vi' ? 'vi' : 'en';
  const theme =
    typeof parsed.theme === 'string'
      ? (parsed.theme as ThemeId)
      : DEFAULT_PERSISTED_SETTINGS.theme;
  const accent =
    typeof parsed.accent === 'string'
      ? (parsed.accent as AccentId)
      : DEFAULT_PERSISTED_SETTINGS.accent;
  const animationLevel: AnimationLevel =
    parsed.animationLevel === 'off' ||
    parsed.animationLevel === 'low' ||
    parsed.animationLevel === 'normal'
      ? parsed.animationLevel
      : getDefaultAnimationLevel();

  return {
    version: 2,
    locale,
    theme,
    accent,
    animationLevel,
    background: {
      ...DEFAULT_PERSISTED_SETTINGS.background,
      ...(typeof parsed.background === 'object' && parsed.background
        ? (parsed.background as Partial<BackgroundConfig>)
        : {}),
    },
    clock: {
      ...DEFAULT_PERSISTED_SETTINGS.clock,
      ...(typeof parsed.clock === 'object' && parsed.clock
        ? (parsed.clock as Partial<ClockSettings>)
        : {}),
    },
    pomodoro: {
      ...DEFAULT_PERSISTED_SETTINGS.pomodoro,
      ...(typeof parsed.pomodoro === 'object' && parsed.pomodoro
        ? (parsed.pomodoro as Partial<PomodoroSettings>)
        : {}),
    },
    spotifyUrl: typeof parsed.spotifyUrl === 'string' ? parsed.spotifyUrl : '',
    ambientVolumes: {
      ...DEFAULT_PERSISTED_SETTINGS.ambientVolumes,
      ...(typeof parsed.ambientVolumes === 'object' && parsed.ambientVolumes
        ? (parsed.ambientVolumes as Partial<Record<AmbientChannelId, number>>)
        : {}),
    },
    widgets: validateAllWidgets(
      parsed.widgets as Partial<Record<WidgetId, unknown>> | undefined,
      vw,
      vh
    ),
    focusWidgetIds:
      Array.isArray(parsed.focusWidgetIds) && parsed.focusWidgetIds.length > 0
        ? (parsed.focusWidgetIds as WidgetId[])
        : DEFAULT_PERSISTED_SETTINGS.focusWidgetIds,
    semester: {
      ...DEFAULT_PERSISTED_SETTINGS.semester,
      ...(typeof parsed.semester === 'object' && parsed.semester
        ? (parsed.semester as Partial<SemesterSettings>)
        : {}),
    },
  };
}

function loadPersisted(): PersistedSettings {
  try {
    const rawV2 = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (rawV2) {
      return migratePersistedSettings(JSON.parse(rawV2));
    }
    const rawV1 = window.localStorage.getItem(LEGACY_SETTINGS_KEY_V1);
    if (rawV1) {
      const migrated = migratePersistedSettings(JSON.parse(rawV1));
      try {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(migrated));
      } catch {
        // ignore quota during migration
      }
      return migrated;
    }
    return migratePersistedSettings(null);
  } catch {
    return migratePersistedSettings(null);
  }
}

let persistTimer: number | undefined;

function buildPayload(state: SettingsStore): PersistedSettings {
  return {
    version: 2,
    locale: state.locale,
    theme: state.theme,
    accent: state.accent,
    animationLevel: state.animationLevel,
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
}

function writePersistImmediate(state: SettingsStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(buildPayload(state)));
  } catch {
    useToastStore
      .getState()
      .push('Could not save settings (browser storage full). Try a smaller background image.', 'warning');
  }
}

function schedulePersist(state: SettingsStore): void {
  if (typeof window === 'undefined') return;
  if (persistTimer !== undefined) {
    window.clearTimeout(persistTimer);
  }
  persistTimer = window.setTimeout(() => {
    writePersistImmediate(state);
  }, 300);
}

interface SettingsStore {
  locale: LocaleId;
  theme: ThemeId;
  accent: AccentId;
  animationLevel: AnimationLevel;
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
  previousBackground: Pick<BackgroundConfig, 'kind' | 'presetId' | 'imageUrl' | 'videoUrl'>;

  setLocale: (locale: LocaleId) => void;
  setTheme: (theme: ThemeId) => void;
  setAccent: (accent: AccentId) => void;
  setAnimationLevel: (level: AnimationLevel) => void;
  updateBackground: (patch: Partial<BackgroundConfig>) => void;
  applyVideoSource: (url: string) => void;
  revertBackground: () => void;
  updateClock: (patch: Partial<ClockSettings>) => void;
  updatePomodoro: (patch: Partial<PomodoroSettings>) => void;
  setSpotifyUrl: (url: string) => void;
  toggleAmbientChannel: (id: AmbientChannelId) => void;
  setAmbientVolume: (id: AmbientChannelId, volume: number) => void;
  toggleWidget: (id: WidgetId) => void;
  setWidgetVisible: (id: WidgetId, visible: boolean) => void;
  toggleMinimizeWidget: (id: WidgetId) => void;
  moveWidget: (id: WidgetId, x: number, y: number) => void;
  resizeWidget: (id: WidgetId, x: number, y: number, width: number, height: number) => void;
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
  getPersistedSnapshot: () => PersistedSettings;
  importPersistedSettings: (raw: unknown) => void;
  resetAllSettings: () => void;
}

const initial = typeof window !== 'undefined' ? loadPersisted() : migratePersistedSettings(null);

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  locale: initial.locale,
  theme: initial.theme,
  accent: initial.accent,
  animationLevel: initial.animationLevel,
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
  previousBackground: {
    kind: 'gradient',
    presetId: initial.background.presetId,
    imageUrl: initial.background.imageUrl,
    videoUrl: '',
  },

  setLocale: (locale) => {
    set({ locale });
    writePersistImmediate(get());
  },

  setTheme: (theme) => {
    set({ theme });
    schedulePersist(get());
  },

  setAccent: (accent) => {
    set({ accent });
    schedulePersist(get());
  },

  setAnimationLevel: (animationLevel) => {
    set({ animationLevel });
    schedulePersist(get());
  },

  updateBackground: (patch) => {
    set((s) => {
      const next = { ...s.background, ...patch };
      const shouldSavePrev =
        patch.kind !== undefined && patch.kind !== 'video'
          ? {
              kind: patch.kind,
              presetId: next.presetId,
              imageUrl: next.imageUrl,
              videoUrl: next.videoUrl,
            }
          : s.background.kind !== 'video' && patch.kind === 'video'
            ? {
                kind: s.background.kind,
                presetId: s.background.presetId,
                imageUrl: s.background.imageUrl,
                videoUrl: s.background.videoUrl,
              }
            : s.previousBackground;
      return { background: next, previousBackground: shouldSavePrev };
    });
    schedulePersist(get());
  },

  applyVideoSource: (url) => {
    const clean = url.trim();
    if (!clean) return;
    set((s) => {
      const prev =
        s.background.kind !== 'video'
          ? {
              kind: s.background.kind,
              presetId: s.background.presetId,
              imageUrl: s.background.imageUrl,
              videoUrl: s.background.videoUrl,
            }
          : s.previousBackground;
      const existing = s.background.recentVideoSources ?? [];
      const recentVideoSources = [clean, ...existing.filter((u) => u !== clean)].slice(0, 5);
      return {
        previousBackground: prev,
        background: {
          ...s.background,
          kind: 'video',
          videoUrl: clean,
          recentVideoSources,
        },
      };
    });
    schedulePersist(get());
  },

  revertBackground: () => {
    set((s) => {
      const fallback = s.previousBackground;
      return {
        background: {
          ...s.background,
          kind: fallback.kind === 'video' ? 'gradient' : fallback.kind,
          presetId: fallback.presetId || DEFAULT_PERSISTED_SETTINGS.background.presetId,
          imageUrl: fallback.imageUrl,
          videoUrl: '',
        },
      };
    });
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

  resizeWidget: (id, x, y, width, height) => {
    set((s) => ({
      widgets: {
        ...s.widgets,
        [id]: { ...s.widgets[id], x, y, width, height },
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
    set({ widgets: validateAllWidgets(undefined), activeMobileWidget: 'clock' });
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

  getPersistedSnapshot: () => buildPayload(get()),

  importPersistedSettings: (raw) => {
    const next = migratePersistedSettings(raw);
    set({
      locale: next.locale,
      theme: next.theme,
      accent: next.accent,
      animationLevel: next.animationLevel,
      background: next.background,
      clock: next.clock,
      pomodoro: next.pomodoro,
      spotifyUrl: next.spotifyUrl,
      ambient: {
        rain: { playing: false, volume: next.ambientVolumes.rain },
        cafe: { playing: false, volume: next.ambientVolumes.cafe },
        'white-noise': { playing: false, volume: next.ambientVolumes['white-noise'] },
      },
      widgets: next.widgets,
      focusWidgetIds: next.focusWidgetIds,
      semester: next.semester,
    });
    writePersistImmediate(get());
  },

  resetAllSettings: () => {
    const next = migratePersistedSettings(null);
    set({
      locale: next.locale,
      theme: next.theme,
      accent: next.accent,
      animationLevel: next.animationLevel,
      background: next.background,
      clock: next.clock,
      pomodoro: next.pomodoro,
      spotifyUrl: next.spotifyUrl,
      ambient: {
        rain: { playing: false, volume: next.ambientVolumes.rain },
        cafe: { playing: false, volume: next.ambientVolumes.cafe },
        'white-noise': { playing: false, volume: next.ambientVolumes['white-noise'] },
      },
      widgets: next.widgets,
      activeMobileWidget: 'clock',
      focusMode: false,
      focusWidgetIds: next.focusWidgetIds,
      semester: next.semester,
    });
    writePersistImmediate(get());
  },
}));
