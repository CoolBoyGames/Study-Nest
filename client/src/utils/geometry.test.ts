import { describe, expect, it } from 'vitest';
import { createDefaultWidgetLayout, WIDGET_REGISTRY } from '../constants/widgetRegistry';
import {
  clampWidgetPosition,
  computeResize,
  snapToGrid,
  validateWidgetLayout,
  type ResizeHandle,
  type WidgetRect,
} from './geometry';

const BASE_RECT: WidgetRect = { x: 200, y: 160, width: 320, height: 240 };

const BASE_CONSTRAINTS = {
  minSize: { width: 200, height: 120 },
  maxSize: { width: 640, height: 520 },
  viewportWidth: 1280,
  viewportHeight: 800,
};

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

describe('computeResize', () => {
  it('handles all 8 resize handles cleanly', () => {
    const cases: Array<{ handle: ResizeHandle; dx: number; dy: number; expected: WidgetRect }> = [
      { handle: 'e', dx: 40, dy: 99, expected: { x: 200, y: 160, width: 360, height: 240 } },
      { handle: 'w', dx: -40, dy: 99, expected: { x: 160, y: 160, width: 360, height: 240 } },
      { handle: 's', dx: 99, dy: 48, expected: { x: 200, y: 160, width: 320, height: 288 } },
      { handle: 'n', dx: 99, dy: -48, expected: { x: 200, y: 112, width: 320, height: 288 } },
      { handle: 'se', dx: 32, dy: 24, expected: { x: 200, y: 160, width: 352, height: 264 } },
      { handle: 'ne', dx: 32, dy: -24, expected: { x: 200, y: 136, width: 352, height: 264 } },
      { handle: 'sw', dx: -32, dy: 24, expected: { x: 168, y: 160, width: 352, height: 264 } },
      { handle: 'nw', dx: -32, dy: -24, expected: { x: 168, y: 136, width: 352, height: 264 } },
    ];

    for (const c of cases) {
      expect(computeResize(BASE_RECT, c.handle, { dx: c.dx, dy: c.dy }, BASE_CONSTRAINTS)).toEqual(
        c.expected
      );
    }
  });

  it('anchors the opposite right/bottom edges when shrinking from left or top past minSize', () => {
    const anchorRight = BASE_RECT.x + BASE_RECT.width;
    const anchorBottom = BASE_RECT.y + BASE_RECT.height;

    const res = computeResize(BASE_RECT, 'nw', { dx: 500, dy: 500 }, BASE_CONSTRAINTS);
    expect(res.width).toBe(200);
    expect(res.height).toBe(120);
    expect(res.x + res.width).toBe(anchorRight);
    expect(res.y + res.height).toBe(anchorBottom);
  });

  it('clamps sizes against maxSize and viewport boundaries', () => {
    const resSE = computeResize(
      { x: 1000, y: 500, width: 240, height: 180 },
      'se',
      { dx: 500, dy: 500 },
      {
        minSize: { width: 200, height: 120 },
        maxSize: { width: 900, height: 900 },
        viewportWidth: 1280,
        viewportHeight: 800,
      }
    );
    expect(resSE.x + resSE.width).toBeLessThanOrEqual(1280 - 16);
    expect(resSE.y + resSE.height).toBeLessThanOrEqual(800 - 88);

    const resNW = computeResize(
      BASE_RECT,
      'nw',
      { dx: -1000, dy: -1000 },
      {
        minSize: { width: 200, height: 120 },
        maxSize: { width: 900, height: 900 },
        viewportWidth: 1280,
        viewportHeight: 800,
      }
    );
    expect(resNW.x).toBe(16);
    expect(resNW.y).toBe(16);
    expect(resNW.x + resNW.width).toBe(BASE_RECT.x + BASE_RECT.width);
    expect(resNW.y + resNW.height).toBe(BASE_RECT.y + BASE_RECT.height);

    const capped = computeResize(BASE_RECT, 'se', { dx: 999, dy: 999 }, BASE_CONSTRAINTS);
    expect(capped.width).toBe(640);
    expect(capped.height).toBe(520);
  });

  it('snaps to the 8px grid unless snap is disabled (Shift key)', () => {
    const snapped = computeResize(BASE_RECT, 'se', { dx: 13, dy: 11 }, BASE_CONSTRAINTS);
    expect(snapped.width).toBe(336);
    expect(snapped.height).toBe(248);

    const free = computeResize(BASE_RECT, 'se', { dx: 13, dy: 11 }, {
      ...BASE_CONSTRAINTS,
      snap: false,
    });
    expect(free.width).toBe(333);
    expect(free.height).toBe(251);
  });

  it('preserves aspect ratio when lockAspect is enabled', () => {
    const squareStart: WidgetRect = { x: 160, y: 120, width: 240, height: 240 };
    const squareConstraints = {
      minSize: { width: 160, height: 160 },
      maxSize: { width: 480, height: 480 },
      viewportWidth: 1280,
      viewportHeight: 800,
      lockAspect: true,
    };

    const grown = computeResize(squareStart, 'se', { dx: 80, dy: 16 }, squareConstraints);
    expect(grown.width).toBe(320);
    expect(grown.height).toBe(320);

    const fromTopLeft = computeResize(squareStart, 'nw', { dx: -40, dy: -8 }, squareConstraints);
    expect(fromTopLeft.width).toBe(fromTopLeft.height);
    expect(fromTopLeft.x + fromTopLeft.width).toBe(squareStart.x + squareStart.width);
    expect(fromTopLeft.y + fromTopLeft.height).toBe(squareStart.y + squareStart.height);
  });
});

describe('validateWidgetLayout', () => {
  it('backfills missing height from default and clamps oversized dims', () => {
    const def = createDefaultWidgetLayout('notes');
    const validated = validateWidgetLayout(
      { id: 'notes', visible: true, minimized: false, x: 120, y: 80, width: 4000, zIndex: 18 },
      def,
      WIDGET_REGISTRY.notes,
      1280,
      800
    );
    expect(validated.visible).toBe(true);
    expect(validated.height).toBe(WIDGET_REGISTRY.notes.defaultSize.height);
    expect(validated.width).toBeLessThanOrEqual(WIDGET_REGISTRY.notes.maxSize.width);
    expect(validated.x + validated.width).toBeLessThanOrEqual(1280 - 16);
  });

  it('falls back to defaults for invalid or off-screen persisted layouts', () => {
    const def = createDefaultWidgetLayout('clock');

    const offScreen = validateWidgetLayout(
      { id: 'clock', visible: true, minimized: false, x: 2400, y: 1200, width: 280, height: 220, zIndex: 15 },
      def,
      WIDGET_REGISTRY.clock,
      1280,
      800
    );
    expect(offScreen.x).toBe(def.x);
    expect(offScreen.y).toBe(def.y);
    expect(offScreen.width).toBe(def.width);
    expect(offScreen.height).toBe(def.height);

    const invalidDims = validateWidgetLayout(
      { id: 'clock', visible: true, minimized: false, x: 40, y: 40, width: -10, height: Number.NaN, zIndex: 11 },
      def,
      WIDGET_REGISTRY.clock,
      1280,
      800
    );
    expect(invalidDims.x).toBe(def.x);
    expect(invalidDims.width).toBe(def.width);
    expect(invalidDims.height).toBe(def.height);
  });

  it('preserves valid persisted positions and sizes', () => {
    const def = createDefaultWidgetLayout('vocab');
    const valid = validateWidgetLayout(
      { id: 'vocab', visible: true, minimized: false, x: 128, y: 64, width: 520, height: 504, zIndex: 25 },
      def,
      WIDGET_REGISTRY.vocab,
      1280,
      800
    );
    expect(valid).toEqual({
      id: 'vocab',
      visible: true,
      minimized: false,
      x: 128,
      y: 64,
      width: 520,
      height: 504,
      zIndex: 25,
    });
  });
});
