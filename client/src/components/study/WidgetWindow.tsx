import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { GripHorizontal, Maximize2, Minimize2, X } from 'lucide-react';
import type { WidgetId } from '@studyspace/shared';
import { createDefaultWidgetLayout, WIDGET_REGISTRY } from '../../constants/widgetRegistry';
import { useT } from '../../i18n';
import { useSettingsStore } from '../../stores/useSettingsStore';
import {
  clampWidgetPosition,
  computeResize,
  type ResizeHandle,
  type WidgetRect,
  validateWidgetLayout,
} from '../../utils/geometry';
import { IconButton } from '../ui';

export interface WidgetWindowProps {
  id: WidgetId;
  title: string;
  children: ReactNode;
  layoutMode: 'free' | 'grid' | 'sheet';
  forceVisible?: boolean;
}

interface HandleConfig {
  handle: ResizeHandle;
  label: string;
  orientation: 'horizontal' | 'vertical';
  cursor: string;
  className: string;
  indicatorClassName: string;
}

const HANDLE_CONFIGS: HandleConfig[] = [
  {
    handle: 'n',
    label: 'Resize widget (top edge)',
    orientation: 'horizontal',
    cursor: 'ns-resize',
    className: 'resize-handle-n left-4 right-4 top-0 h-2 cursor-ns-resize flex items-start',
    indicatorClassName: 'mx-auto mt-0.5 h-0.5 w-8 rounded-full bg-current',
  },
  {
    handle: 's',
    label: 'Resize widget (bottom edge)',
    orientation: 'horizontal',
    cursor: 'ns-resize',
    className: 'resize-handle-s left-4 right-4 bottom-0 h-2 cursor-ns-resize flex items-end',
    indicatorClassName: 'mx-auto mb-0.5 h-0.5 w-8 rounded-full bg-current',
  },
  {
    handle: 'w',
    label: 'Resize widget (left edge)',
    orientation: 'vertical',
    cursor: 'ew-resize',
    className: 'resize-handle-w top-4 bottom-4 left-0 w-2 cursor-ew-resize flex items-center',
    indicatorClassName: 'ml-0.5 h-8 w-0.5 rounded-full bg-current',
  },
  {
    handle: 'e',
    label: 'Resize widget (right edge)',
    orientation: 'vertical',
    cursor: 'ew-resize',
    className: 'resize-handle-e top-4 bottom-4 right-0 w-2 cursor-ew-resize flex items-center justify-end',
    indicatorClassName: 'mr-0.5 h-8 w-0.5 rounded-full bg-current',
  },
  {
    handle: 'nw',
    label: 'Resize widget (top-left corner)',
    orientation: 'horizontal',
    cursor: 'nwse-resize',
    className: 'resize-handle-corner left-0 top-0 h-4 w-4 cursor-nwse-resize flex',
    indicatorClassName: 'ml-1 mt-1 h-2 w-2 rounded-tl border-l-2 border-t-2 border-current',
  },
  {
    handle: 'ne',
    label: 'Resize widget (top-right corner)',
    orientation: 'horizontal',
    cursor: 'nesw-resize',
    className: 'resize-handle-corner right-0 top-0 h-4 w-4 cursor-nesw-resize flex justify-end',
    indicatorClassName: 'mr-1 mt-1 h-2 w-2 rounded-tr border-r-2 border-t-2 border-current',
  },
  {
    handle: 'sw',
    label: 'Resize widget (bottom-left corner)',
    orientation: 'horizontal',
    cursor: 'nesw-resize',
    className: 'resize-handle-corner bottom-0 left-0 h-4 w-4 cursor-nesw-resize flex items-end',
    indicatorClassName: 'ml-1 mb-1 h-2 w-2 rounded-bl border-b-2 border-l-2 border-current',
  },
  {
    handle: 'se',
    label: 'Resize widget (bottom-right corner)',
    orientation: 'horizontal',
    cursor: 'nwse-resize',
    className: 'resize-handle-corner bottom-0 right-0 h-4 w-4 cursor-nwse-resize flex items-end justify-end',
    indicatorClassName: 'mr-1 mb-1 h-2 w-2 rounded-br border-b-2 border-r-2 border-current',
  },
];

interface ActiveDrag {
  pointerId: number;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  lastX: number;
  lastY: number;
  rafId: number | null;
}

interface ActiveResize {
  handle: ResizeHandle;
  pointerId: number;
  target: HTMLElement;
  startX: number;
  startY: number;
  startRect: WidgetRect;
  latestRect: WidgetRect;
  lastClientX: number;
  lastClientY: number;
  shiftKey: boolean;
  rafId: number | null;
}

export function WidgetWindow({
  id,
  title,
  children,
  layoutMode,
  forceVisible = false,
}: WidgetWindowProps) {
  const { t } = useT();
  const widget = useSettingsStore((s) => s.widgets[id]);
  const clockMode = useSettingsStore((s) => s.clock.mode);
  const moveWidget = useSettingsStore((s) => s.moveWidget);
  const resizeWidget = useSettingsStore((s) => s.resizeWidget);
  const bringToFront = useSettingsStore((s) => s.bringToFront);
  const toggleMinimizeWidget = useSettingsStore((s) => s.toggleMinimizeWidget);
  const setWidgetVisible = useSettingsStore((s) => s.setWidgetVisible);

  const spec = WIDGET_REGISTRY[id];
  const panelRef = useRef<HTMLElement>(null);
  const dragRef = useRef<ActiveDrag | null>(null);
  const resizeRef = useRef<ActiveResize | null>(null);
  const kbBaselineRef = useRef<WidgetRect | null>(null);
  const escListenerRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  const isVisible = forceVisible || widget.visible;
  const widgetHeight = widget.height ?? spec.defaultSize.height;

  const getResizeConstraints = useCallback(
    (snap = true) => {
      const lockAspect =
        id === 'clock' && clockMode === 'analog' ? spec.lockAspect ?? true : spec.lockAspect;
      return {
        minSize: spec.minSize,
        maxSize: spec.maxSize,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        snap,
        lockAspect,
      };
    },
    [clockMode, id, spec.lockAspect, spec.maxSize, spec.minSize]
  );

  const applyDomRect = useCallback(
    (rect: WidgetRect) => {
      const el = panelRef.current;
      if (!el) return;
      el.style.transform = `translate3d(${rect.x}px, ${rect.y}px, 0)`;
      el.style.width = `${rect.width}px`;
      if (!widget.minimized) {
        el.style.height = `${rect.height}px`;
      }
    },
    [widget.minimized]
  );

  const cleanupInteractionStyles = useCallback(() => {
    document.body.classList.remove('studynest-interacting');
    document.body.removeAttribute('data-resize-cursor');
    if (escListenerRef.current) {
      window.removeEventListener('keydown', escListenerRef.current, true);
      escListenerRef.current = null;
    }
  }, []);

  // Cleanup any in-flight rAF / body classes on unmount
  useEffect(() => {
    return () => {
      if (dragRef.current?.rafId != null) window.cancelAnimationFrame(dragRef.current.rafId);
      if (resizeRef.current?.rafId != null) window.cancelAnimationFrame(resizeRef.current.rafId);
      cleanupInteractionStyles();
    };
  }, [cleanupInteractionStyles]);

  // Re-validate size and position when the browser window resizes in free mode
  useEffect(() => {
    if (layoutMode !== 'free' || !isVisible) return;
    const handleWindowResize = () => {
      const validated = validateWidgetLayout(
        { ...widget, height: widgetHeight },
        createDefaultWidgetLayout(id),
        spec,
        window.innerWidth,
        window.innerHeight
      );
      if (
        validated.x !== widget.x ||
        validated.y !== widget.y ||
        validated.width !== widget.width ||
        validated.height !== widgetHeight
      ) {
        resizeWidget(id, validated.x, validated.y, validated.width, validated.height);
      }
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [id, isVisible, layoutMode, resizeWidget, spec, widget, widgetHeight]);

  if (!isVisible) return null;

  // --- Drag handlers (rAF, zero React setState per pixel) ---
  const handleDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (layoutMode !== 'free') return;
    if ((e.target as HTMLElement).closest('button')) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    bringToFront(id);
    document.body.classList.add('studynest-interacting');

    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: widget.x,
      origY: widget.y,
      lastX: widget.x,
      lastY: widget.y,
      rafId: null,
    };
  };

  const handleDragPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const active = dragRef.current;
    if (!active || active.pointerId !== e.pointerId) return;
    active.lastX = active.origX + (e.clientX - active.startX);
    active.lastY = active.origY + (e.clientY - active.startY);

    if (active.rafId === null) {
      active.rafId = window.requestAnimationFrame(() => {
        active.rafId = null;
        if (panelRef.current) {
          panelRef.current.style.transform = `translate3d(${active.lastX}px, ${active.lastY}px, 0)`;
        }
      });
    }
  };

  const handleDragPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const active = dragRef.current;
    if (!active || active.pointerId !== e.pointerId) return;
    if (active.rafId !== null) window.cancelAnimationFrame(active.rafId);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if capture already released
    }
    cleanupInteractionStyles();
    dragRef.current = null;

    if (e.type === 'pointercancel') {
      if (panelRef.current) {
        panelRef.current.style.transform = `translate3d(${active.origX}px, ${active.origY}px, 0)`;
      }
      return;
    }

    const height = panelRef.current?.offsetHeight ?? widgetHeight;
    const snapped = clampWidgetPosition(
      active.origX + (e.clientX - active.startX),
      active.origY + (e.clientY - active.startY),
      {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        widgetWidth: widget.width,
        widgetHeight: height,
      }
    );

    if (panelRef.current) {
      panelRef.current.style.transform = `translate3d(${snapped.x}px, ${snapped.y}px, 0)`;
    }
    moveWidget(id, snapped.x, snapped.y);
  };

  // --- Resize handlers (8 edges/corners, pointer capture, rAF, Shift/Esc/DblClick) ---
  const cancelActiveResize = () => {
    const active = resizeRef.current;
    if (!active) return;
    if (active.rafId !== null) window.cancelAnimationFrame(active.rafId);
    try {
      active.target.releasePointerCapture(active.pointerId);
    } catch {
      // ignore
    }
    applyDomRect(active.startRect);
    resizeRef.current = null;
    cleanupInteractionStyles();
  };

  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    config: HandleConfig
  ) => {
    if (layoutMode !== 'free' || widget.minimized) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();
    bringToFront(id);
    kbBaselineRef.current = null;

    const startRect: WidgetRect = {
      x: widget.x,
      y: widget.y,
      width: widget.width,
      height: panelRef.current?.offsetHeight || widgetHeight,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.classList.add('studynest-interacting');
    document.body.setAttribute('data-resize-cursor', config.cursor);

    const onEscCancel = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        cancelActiveResize();
      }
    };
    escListenerRef.current = onEscCancel;
    window.addEventListener('keydown', onEscCancel, true);

    resizeRef.current = {
      handle: config.handle,
      pointerId: e.pointerId,
      target: e.currentTarget,
      startX: e.clientX,
      startY: e.clientY,
      startRect,
      latestRect: startRect,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
      shiftKey: e.shiftKey,
      rafId: null,
    };
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const active = resizeRef.current;
    if (!active || active.pointerId !== e.pointerId) return;

    active.lastClientX = e.clientX;
    active.lastClientY = e.clientY;
    active.shiftKey = e.shiftKey;

    if (active.rafId === null) {
      active.rafId = window.requestAnimationFrame(() => {
        active.rafId = null;
        if (!resizeRef.current) return;
        const nextRect = computeResize(
          active.startRect,
          active.handle,
          {
            dx: active.lastClientX - active.startX,
            dy: active.lastClientY - active.startY,
          },
          getResizeConstraints(!active.shiftKey)
        );
        active.latestRect = nextRect;
        applyDomRect(nextRect);
      });
    }
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const active = resizeRef.current;
    if (!active || active.pointerId !== e.pointerId) return;

    if (active.rafId !== null) window.cancelAnimationFrame(active.rafId);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    cleanupInteractionStyles();
    resizeRef.current = null;

    if (e.type === 'pointercancel') {
      applyDomRect(active.startRect);
      return;
    }

    const finalRect = computeResize(
      active.startRect,
      active.handle,
      {
        dx: e.clientX - active.startX,
        dy: e.clientY - active.startY,
      },
      getResizeConstraints(!e.shiftKey)
    );
    applyDomRect(finalRect);
    resizeWidget(id, finalRect.x, finalRect.y, finalRect.width, finalRect.height);
  };

  const handleResizeDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (layoutMode !== 'free' || widget.minimized) return;
    e.stopPropagation();
    const defW = spec.defaultSize.width;
    const defH = spec.defaultSize.height;
    const pos = clampWidgetPosition(widget.x, widget.y, {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      widgetWidth: defW,
      widgetHeight: defH,
    });
    resizeWidget(id, pos.x, pos.y, defW, defH);
  };

  const handleResizeKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, handle: ResizeHandle) => {
    if (layoutMode !== 'free' || widget.minimized) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (resizeRef.current) {
        cancelActiveResize();
        return;
      }
      if (kbBaselineRef.current) {
        const base = kbBaselineRef.current;
        kbBaselineRef.current = null;
        resizeWidget(id, base.x, base.y, base.width, base.height);
      }
      return;
    }

    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    bringToFront(id);

    const currentRect: WidgetRect = {
      x: widget.x,
      y: widget.y,
      width: widget.width,
      height: widgetHeight,
    };
    if (!kbBaselineRef.current) {
      kbBaselineRef.current = currentRect;
    }

    const step = e.shiftKey ? 32 : 8;
    const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
    const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;

    const nextRect = computeResize(
      currentRect,
      handle,
      { dx, dy },
      getResizeConstraints(false)
    );
    resizeWidget(id, nextRect.x, nextRect.y, nextRect.width, nextRect.height);
  };

  const freeStyle =
    layoutMode === 'free'
      ? {
          transform: `translate3d(${widget.x}px, ${widget.y}px, 0)`,
          width: `${widget.width}px`,
          height: widget.minimized ? undefined : `${widgetHeight}px`,
          zIndex: widget.zIndex,
        }
      : undefined;

  const containerClasses =
    layoutMode === 'free'
      ? 'fixed left-0 top-0 max-h-[calc(100vh-104px)]'
      : layoutMode === 'sheet'
        ? 'relative w-full max-h-[72vh]'
        : 'relative w-full';

  return (
    <section
      ref={panelRef}
      aria-label={`${title} widget`}
      onMouseDown={() => {
        if (layoutMode === 'free') bringToFront(id);
      }}
      style={freeStyle}
      className={`group/widget glass-panel flex flex-col text-[var(--text)] ${containerClasses}`}
    >
      <div className="animate-fade-in flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-md)]">
        <div
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerUp}
          onPointerCancel={handleDragPointerUp}
          className={`flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2 select-none ${
            layoutMode === 'free' ? 'touch-none cursor-grab active:cursor-grabbing' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            {layoutMode === 'free' && (
              <GripHorizontal size={16} strokeWidth={1.5} className="text-[var(--text-muted)]" />
            )}
            <h2 className="font-heading text-sm font-semibold tracking-tight">{title}</h2>
          </div>

          <div className="flex items-center gap-1">
            {layoutMode !== 'sheet' && (
              <IconButton
                label={
                  widget.minimized
                    ? t('window.expand', { title })
                    : t('window.minimize', { title })
                }
                onClick={() => toggleMinimizeWidget(id)}
              >
                {widget.minimized ? (
                  <Maximize2 size={16} strokeWidth={1.5} />
                ) : (
                  <Minimize2 size={16} strokeWidth={1.5} />
                )}
              </IconButton>
            )}
            <IconButton label={t('window.close', { title })} onClick={() => setWidgetVisible(id, false)}>
              <X size={16} strokeWidth={1.5} />
            </IconButton>
          </div>
        </div>

        {(!widget.minimized || layoutMode === 'sheet') && (
          <div
            className={`min-h-0 flex-1 [container-type:inline-size] ${
              id === 'spotify'
                ? 'flex flex-col overflow-hidden p-0'
                : 'overflow-y-auto p-[var(--space-4)]'
            }`}
          >
            {children}
          </div>
        )}
      </div>

      {layoutMode === 'free' &&
        !widget.minimized &&
        HANDLE_CONFIGS.map((cfg) => (
          <div
            key={cfg.handle}
            role="separator"
            tabIndex={0}
            aria-label={t('window.resizeHandle', { dir: t(`window.dir.${cfg.handle}`) })}
            aria-orientation={cfg.orientation}
            data-resize-handle={cfg.handle}
            onPointerDown={(e) => handleResizePointerDown(e, cfg)}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            onDoubleClick={handleResizeDoubleClick}
            onFocus={() => {
              if (!kbBaselineRef.current) {
                kbBaselineRef.current = {
                  x: widget.x,
                  y: widget.y,
                  width: widget.width,
                  height: widgetHeight,
                };
              }
            }}
            onBlur={() => {
              kbBaselineRef.current = null;
            }}
            onKeyDown={(e) => handleResizeKeyDown(e, cfg.handle)}
            className={`absolute z-10 touch-none text-[var(--text-muted)] opacity-0 transition-opacity duration-150 hover:text-[var(--primary)] focus-visible:text-[var(--primary)] focus-visible:opacity-100 group-hover/widget:opacity-100 group-focus-within/widget:opacity-100 ${cfg.className}`}
          >
            <span aria-hidden="true" className={cfg.indicatorClassName} />
          </div>
        ))}
    </section>
  );
}
