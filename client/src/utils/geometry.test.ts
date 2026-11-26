import { describe, expect, it } from 'vitest';
import { clampWidgetPosition, snapToGrid } from './geometry';

describe('geometry utilities', () => {
  it('snaps coordinates to the 8px grid', () => {
    expect(snapToGrid(0)).toBe(0);
    expect(snapToGrid(11)).toBe(8);
    expect(snapToGrid(13)).toBe(16);
    expect(snapToGrid(100)).toBe(104);
  });

  it('clamps widget positions inside the viewport with margin and bottom dock reserve', () => {
    const pos = clampWidgetPosition(2000, 2000, {
      viewportWidth: 1280,
      viewportHeight: 800,
      widgetWidth: 320,
      widgetHeight: 240,
    });
    expect(pos.x).toBeLessThanOrEqual(1280 - 320 - 16);
    expect(pos.y).toBeLessThanOrEqual(800 - 240 - 88);
    expect(pos.x % 8).toBe(0);
    expect(pos.y % 8).toBe(0);
  });

  it('prevents negative coordinates below margin', () => {
    const pos = clampWidgetPosition(-50, -20, {
      viewportWidth: 1280,
      viewportHeight: 800,
      widgetWidth: 320,
      widgetHeight: 240,
    });
    expect(pos).toEqual({ x: 16, y: 16 });
  });
});
