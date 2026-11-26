import type { WidgetId, WidgetLayout } from '@studyspace/shared';

export interface WidgetSize {
  width: number;
  height: number;
}

export interface WidgetSpec {
  id: WidgetId;
  title: string;
  minSize: WidgetSize;
  maxSize: WidgetSize;
  defaultSize: WidgetSize;
  defaultPosition: { x: number; y: number };
  defaultVisible: boolean;
  defaultZIndex: number;
  lockAspect?: boolean | number;
}

/**
 * Single source of truth for per-widget dimensions, defaults, and resize bounds.
 * Sizes align with the 8px layout grid unless constrained by explicit minimums.
 */
export const WIDGET_REGISTRY: Record<WidgetId, WidgetSpec> = {
  today: {
    id: 'today',
    title: 'Today',
    minSize: { width: 280, height: 220 },
    defaultSize: { width: 360, height: 424 },
    maxSize: { width: 640, height: 760 },
    defaultPosition: { x: 384, y: 32 },
    defaultVisible: false,
    defaultZIndex: 21,
  },
  clock: {
    id: 'clock',
    title: 'Clock',
    minSize: { width: 200, height: 120 },
    defaultSize: { width: 280, height: 216 },
    maxSize: { width: 520, height: 480 },
    defaultPosition: { x: 32, y: 32 },
    defaultVisible: true,
    defaultZIndex: 11,
  },
  pomodoro: {
    id: 'pomodoro',
    title: 'Focus Timer',
    minSize: { width: 260, height: 220 },
    defaultSize: { width: 320, height: 344 },
    maxSize: { width: 560, height: 560 },
    defaultPosition: { x: 32, y: 264 },
    defaultVisible: true,
    defaultZIndex: 12,
  },
  ambient: {
    id: 'ambient',
    title: 'Ambient Sounds',
    minSize: { width: 240, height: 200 },
    defaultSize: { width: 320, height: 312 },
    maxSize: { width: 520, height: 560 },
    defaultPosition: { x: 384, y: 32 },
    defaultVisible: false,
    defaultZIndex: 13,
  },
  spotify: {
    id: 'spotify',
    title: 'Spotify',
    minSize: { width: 280, height: 220 },
    defaultSize: { width: 344, height: 368 },
    maxSize: { width: 600, height: 640 },
    defaultPosition: { x: 384, y: 320 },
    defaultVisible: false,
    defaultZIndex: 14,
  },
  appearance: {
    id: 'appearance',
    title: 'Appearance',
    minSize: { width: 280, height: 240 },
    defaultSize: { width: 360, height: 464 },
    maxSize: { width: 640, height: 760 },
    defaultPosition: { x: 752, y: 32 },
    defaultVisible: false,
    defaultZIndex: 15,
  },
  vocab: {
    id: 'vocab',
    title: 'Vocabulary SRS',
    minSize: { width: 360, height: 320 },
    defaultSize: { width: 440, height: 480 },
    maxSize: { width: 760, height: 760 },
    defaultPosition: { x: 744, y: 32 },
    defaultVisible: false,
    defaultZIndex: 16,
  },
  todos: {
    id: 'todos',
    title: 'Daily To-Do',
    minSize: { width: 280, height: 240 },
    defaultSize: { width: 344, height: 448 },
    maxSize: { width: 680, height: 760 },
    defaultPosition: { x: 384, y: 32 },
    defaultVisible: false,
    defaultZIndex: 17,
  },
  notes: {
    id: 'notes',
    title: 'Scratchpad',
    minSize: { width: 320, height: 240 },
    defaultSize: { width: 584, height: 440 },
    maxSize: { width: 960, height: 784 },
    defaultPosition: { x: 384, y: 320 },
    defaultVisible: false,
    defaultZIndex: 18,
  },
  analytics: {
    id: 'analytics',
    title: 'Study Analytics',
    minSize: { width: 300, height: 240 },
    defaultSize: { width: 424, height: 416 },
    maxSize: { width: 760, height: 720 },
    defaultPosition: { x: 760, y: 32 },
    defaultVisible: false,
    defaultZIndex: 19,
  },
  timetable: {
    id: 'timetable',
    title: 'Timetable',
    minSize: { width: 480, height: 360 },
    defaultSize: { width: 680, height: 520 },
    maxSize: { width: 1120, height: 840 },
    defaultPosition: { x: 368, y: 32 },
    defaultVisible: false,
    defaultZIndex: 20,
  },
};

export function createDefaultWidgetLayout(id: WidgetId): WidgetLayout {
  const spec = WIDGET_REGISTRY[id];
  return {
    id,
    visible: spec.defaultVisible,
    minimized: false,
    x: spec.defaultPosition.x,
    y: spec.defaultPosition.y,
    width: spec.defaultSize.width,
    height: spec.defaultSize.height,
    zIndex: spec.defaultZIndex,
  };
}

export function createDefaultWidgetsMap(): Record<WidgetId, WidgetLayout> {
  return {
    today: createDefaultWidgetLayout('today'),
    clock: createDefaultWidgetLayout('clock'),
    pomodoro: createDefaultWidgetLayout('pomodoro'),
    ambient: createDefaultWidgetLayout('ambient'),
    spotify: createDefaultWidgetLayout('spotify'),
    appearance: createDefaultWidgetLayout('appearance'),
    vocab: createDefaultWidgetLayout('vocab'),
    todos: createDefaultWidgetLayout('todos'),
    notes: createDefaultWidgetLayout('notes'),
    analytics: createDefaultWidgetLayout('analytics'),
    timetable: createDefaultWidgetLayout('timetable'),
  };
}
