export const GRID_SIZE = 8;

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
  const margin = bounds.margin ?? 16;
  const bottomReserve = bounds.bottomReserve ?? 88;
  const maxX = Math.max(margin, bounds.viewportWidth - bounds.widgetWidth - margin);
  const maxY = Math.max(margin, bounds.viewportHeight - bounds.widgetHeight - bottomReserve);

  const clampedX = Math.min(Math.max(margin, x), maxX);
  const clampedY = Math.min(Math.max(margin, y), maxY);

  return {
    x: snapToGrid(clampedX),
    y: snapToGrid(clampedY),
  };
}
