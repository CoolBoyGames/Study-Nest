import type { WidgetLayout } from '@studyspace/shared';

export const GRID_SIZE = 8;
export const VIEWPORT_MARGIN = 16;
export const DOCK_RESERVE = 88;

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface WidgetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResizeDelta {
  dx: number;
  dy: number;
}

export interface SizeBounds {
  width: number;
  height: number;
}

export interface ResizeConstraints {
  minSize: SizeBounds;
  maxSize?: SizeBounds;
  viewportWidth: number;
  viewportHeight: number;
  margin?: number;
  bottomReserve?: number;
  grid?: number;
  snap?: boolean;
  lockAspect?: boolean | number;
}

export function snapToGrid(value: number, grid = GRID_SIZE): number {
  return Math.round(value / grid) * grid;
}

export interface ClampBounds {
  viewportWidth: number;
  viewportHeight: number;
  widgetWidth: number;
  widgetHeight: number;
  margin?: number;
  bottomReserve?: number;
}

export function clampWidgetPosition(
  x: number,
  y: number,
  bounds: ClampBounds
): { x: number; y: number } {
  const margin = bounds.margin ?? VIEWPORT_MARGIN;
  const bottomReserve = bounds.bottomReserve ?? DOCK_RESERVE;
  const maxX = Math.max(margin, bounds.viewportWidth - bounds.widgetWidth - margin);
  const maxY = Math.max(margin, bounds.viewportHeight - bounds.widgetHeight - bottomReserve);

  const clampedX = Math.min(Math.max(margin, x), maxX);
  const clampedY = Math.min(Math.max(margin, y), maxY);

  return {
    x: snapToGrid(clampedX),
    y: snapToGrid(clampedY),
  };
}

function snapAndClamp(
  raw: number,
  minVal: number,
  maxVal: number,
  snap: boolean,
  grid: number
): number {
  const snapped = snap ? snapToGrid(raw, grid) : Math.round(raw);
  return Math.min(maxVal, Math.max(minVal, snapped));
}

/**
 * Computes a resized widget rectangle from an initial rect, handle, pointer delta,
 * and constraints (min/max bounds, viewport clamping, grid snap, and aspect lock).
 * Resizing from left/top edges anchors the opposite right/bottom edge cleanly.
 */
export function computeResize(
  rect: WidgetRect,
  handle: ResizeHandle,
  delta: ResizeDelta,
  constraints: ResizeConstraints
): WidgetRect {
  const margin = constraints.margin ?? VIEWPORT_MARGIN;
  const bottomReserve = constraints.bottomReserve ?? DOCK_RESERVE;
  const grid = constraints.grid ?? GRID_SIZE;
  const snap = constraints.snap ?? true;

  const anchorRight = rect.x + rect.width;
  const anchorBottom = rect.y + rect.height;

  const hasE = handle.includes('e');
  const hasW = handle.includes('w');
  const hasS = handle.includes('s');
  const hasN = handle.includes('n');

  const rawMaxW = constraints.maxSize?.width ?? Number.POSITIVE_INFINITY;
  const rawMaxH = constraints.maxSize?.height ?? Number.POSITIVE_INFINITY;

  const availW = hasW
    ? Math.max(1, anchorRight - margin)
    : Math.max(1, constraints.viewportWidth - margin - rect.x);
  const availH = hasN
    ? Math.max(1, anchorBottom - margin)
    : Math.max(1, constraints.viewportHeight - bottomReserve - rect.y);

  const effMaxW = Math.max(1, Math.min(rawMaxW, availW));
  const effMinW = Math.min(constraints.minSize.width, effMaxW);
  const effMaxH = Math.max(1, Math.min(rawMaxH, availH));
  const effMinH = Math.min(constraints.minSize.height, effMaxH);

  const candW = hasE ? rect.width + delta.dx : hasW ? rect.width - delta.dx : rect.width;
  const candH = hasS ? rect.height + delta.dy : hasN ? rect.height - delta.dy : rect.height;

  let nextW = rect.width;
  let nextH = rect.height;

  const lock = constraints.lockAspect;
  if (lock) {
    const ratio =
      typeof lock === 'number' && Number.isFinite(lock) && lock > 0
        ? lock
        : rect.width / Math.max(1, rect.height);

    const lowW = Math.max(effMinW, effMinH * ratio);
    const highW = Math.min(effMaxW, effMaxH * ratio);
    const lowH = Math.max(effMinH, effMinW / ratio);
    const highH = Math.min(effMaxH, effMaxW / ratio);

    if (lowW <= highW && lowH <= highH) {
      const horizontalOnly = (hasE || hasW) && !hasN && !hasS;
      const verticalOnly = (hasN || hasS) && !hasE && !hasW;
      const driveByWidth =
        horizontalOnly || (!verticalOnly && Math.abs(delta.dx) >= Math.abs(delta.dy) * ratio);

      if (driveByWidth) {
        nextW = snapAndClamp(candW, lowW, highW, snap, grid);
        nextH = Math.min(effMaxH, Math.max(effMinH, Math.round(nextW / ratio)));
      } else {
        nextH = snapAndClamp(candH, lowH, highH, snap, grid);
        nextW = Math.min(effMaxW, Math.max(effMinW, Math.round(nextH * ratio)));
      }
    } else {
      if (hasE || hasW) nextW = snapAndClamp(candW, effMinW, effMaxW, snap, grid);
      if (hasN || hasS) nextH = snapAndClamp(candH, effMinH, effMaxH, snap, grid);
    }
  } else {
    nextW = hasE || hasW ? snapAndClamp(candW, effMinW, effMaxW, snap, grid) : Math.min(effMaxW, Math.max(effMinW, rect.width));
    nextH = hasN || hasS ? snapAndClamp(candH, effMinH, effMaxH, snap, grid) : Math.min(effMaxH, Math.max(effMinH, rect.height));
  }

  let nextX = hasW ? anchorRight - nextW : rect.x;
  let nextY = hasN ? anchorBottom - nextH : rect.y;

  // Guard viewport edges if rectangle started slightly past bounds
  const maxX = Math.max(margin, constraints.viewportWidth - nextW - margin);
  const maxY = Math.max(margin, constraints.viewportHeight - nextH - bottomReserve);
  nextX = Math.min(Math.max(margin, nextX), maxX);
  nextY = Math.min(Math.max(margin, nextY), maxY);

  return {
    x: nextX,
    y: nextY,
    width: nextW,
    height: nextH,
  };
}

/**
 * Validates a loaded WidgetLayout against per-widget bounds and the current viewport.
 * Falls back to defaults when values are invalid or the widget sits off-screen.
 */
export function validateWidgetLayout(
  raw: unknown,
  defaults: WidgetLayout,
  bounds: { minSize: SizeBounds; maxSize?: SizeBounds },
  viewportWidth: number,
  viewportHeight: number,
  margin = VIEWPORT_MARGIN,
  bottomReserve = DOCK_RESERVE
): WidgetLayout {
  const availW = Math.max(120, viewportWidth - margin * 2);
  const availH = Math.max(100, viewportHeight - margin - bottomReserve);

  const clampDim = (val: number, minVal: number, maxVal: number, avail: number): number => {
    const cappedMax = Math.max(1, Math.min(maxVal, avail));
    const cappedMin = Math.min(minVal, cappedMax);
    return Math.min(cappedMax, Math.max(cappedMin, Math.round(val)));
  };

  const defW = clampDim(
    defaults.width,
    bounds.minSize.width,
    bounds.maxSize?.width ?? availW,
    availW
  );
  const defH = clampDim(
    defaults.height,
    bounds.minSize.height,
    bounds.maxSize?.height ?? availH,
    availH
  );
  const defPos = clampWidgetPosition(defaults.x, defaults.y, {
    viewportWidth,
    viewportHeight,
    widgetWidth: defW,
    widgetHeight: defH,
    margin,
    bottomReserve,
  });

  if (!raw || typeof raw !== 'object') {
    return { ...defaults, x: defPos.x, y: defPos.y, width: defW, height: defH };
  }

  const candidate = raw as Partial<WidgetLayout>;
  const visible = typeof candidate.visible === 'boolean' ? candidate.visible : defaults.visible;
  const minimized =
    typeof candidate.minimized === 'boolean' ? candidate.minimized : defaults.minimized;
  const zIndex =
    typeof candidate.zIndex === 'number' && Number.isFinite(candidate.zIndex)
      ? candidate.zIndex
      : defaults.zIndex;

  const hasValidDims =
    typeof candidate.width === 'number' &&
    Number.isFinite(candidate.width) &&
    candidate.width > 0 &&
    (candidate.height === undefined ||
      (typeof candidate.height === 'number' &&
        Number.isFinite(candidate.height) &&
        candidate.height > 0));

  const validW = hasValidDims
    ? clampDim(
        candidate.width!,
        bounds.minSize.width,
        bounds.maxSize?.width ?? availW,
        availW
      )
    : defW;
  const validH =
    hasValidDims && typeof candidate.height === 'number'
      ? clampDim(
          candidate.height,
          bounds.minSize.height,
          bounds.maxSize?.height ?? availH,
          availH
        )
      : defH;

  const xValid = typeof candidate.x === 'number' && Number.isFinite(candidate.x);
  const yValid = typeof candidate.y === 'number' && Number.isFinite(candidate.y);

  const isOffScreen =
    !xValid ||
    !yValid ||
    !hasValidDims ||
    candidate.x! < 0 ||
    candidate.y! < 0 ||
    candidate.x! >= viewportWidth - margin ||
    candidate.y! >= viewportHeight - bottomReserve;

  if (isOffScreen) {
    return {
      id: defaults.id,
      visible,
      minimized,
      x: defPos.x,
      y: defPos.y,
      width: defW,
      height: defH,
      zIndex,
    };
  }

  const clampedPos = clampWidgetPosition(candidate.x!, candidate.y!, {
    viewportWidth,
    viewportHeight,
    widgetWidth: validW,
    widgetHeight: validH,
    margin,
    bottomReserve,
  });

  return {
    id: defaults.id,
    visible,
    minimized,
    x: clampedPos.x,
    y: clampedPos.y,
    width: validW,
    height: validH,
    zIndex,
  };
}
