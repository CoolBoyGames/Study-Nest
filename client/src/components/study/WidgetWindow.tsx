import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GripHorizontal, Maximize2, Minimize2, X } from 'lucide-react';
import type { WidgetId } from '@studyspace/shared';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { clampWidgetPosition } from '../../utils/geometry';
import { IconButton } from '../ui';

export interface WidgetWindowProps {
  id: WidgetId;
  title: string;
  children: ReactNode;
  layoutMode: 'free' | 'grid' | 'sheet';
  forceVisible?: boolean;
}

export function WidgetWindow({
  id,
  title,
  children,
  layoutMode,
  forceVisible = false,
}: WidgetWindowProps) {
  const widget = useSettingsStore((s) => s.widgets[id]);
  const moveWidget = useSettingsStore((s) => s.moveWidget);
  const bringToFront = useSettingsStore((s) => s.bringToFront);
  const toggleMinimizeWidget = useSettingsStore((s) => s.toggleMinimizeWidget);
  const setWidgetVisible = useSettingsStore((s) => s.setWidgetVisible);

  const panelRef = useRef<HTMLElement>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const dragOrigin = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const isVisible = forceVisible || widget.visible;

  // Clamp position when viewport resizes in free layout mode
  useEffect(() => {
    if (layoutMode !== 'free' || !isVisible) return;
    const handleResize = () => {
      const el = panelRef.current;
      const height = el?.offsetHeight ?? 240;
      const clamped = clampWidgetPosition(widget.x, widget.y, {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        widgetWidth: widget.width,
        widgetHeight: height,
      });
      if (clamped.x !== widget.x || clamped.y !== widget.y) {
        moveWidget(id, clamped.x, clamped.y);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [id, isVisible, layoutMode, moveWidget, widget.width, widget.x, widget.y]);

  if (!isVisible) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (layoutMode !== 'free') return;
    // Do not start drag from header action buttons
    if ((e.target as HTMLElement).closest('button')) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    bringToFront(id);
    dragOrigin.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: widget.x,
      origY: widget.y,
    };
    setDragOffset({ x: widget.x, y: widget.y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOrigin.current) return;
    const dx = e.clientX - dragOrigin.current.startX;
    const dy = e.clientY - dragOrigin.current.startY;
    setDragOffset({
      x: dragOrigin.current.origX + dx,
      y: dragOrigin.current.origY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOrigin.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const dx = e.clientX - dragOrigin.current.startX;
    const dy = e.clientY - dragOrigin.current.startY;
    const el = panelRef.current;
    const height = el?.offsetHeight ?? 240;

    const snapped = clampWidgetPosition(dragOrigin.current.origX + dx, dragOrigin.current.origY + dy, {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      widgetWidth: widget.width,
      widgetHeight: height,
    });

    dragOrigin.current = null;
    setDragOffset(null);
    moveWidget(id, snapped.x, snapped.y);
  };

  const posX = dragOffset ? dragOffset.x : widget.x;
  const posY = dragOffset ? dragOffset.y : widget.y;

  const freeStyle =
    layoutMode === 'free'
      ? {
          transform: `translate3d(${posX}px, ${posY}px, 0)`,
          width: `${widget.width}px`,
          zIndex: widget.zIndex,
        }
      : undefined;

  const containerClasses =
    layoutMode === 'free'
      ? 'fixed left-0 top-0 max-h-[calc(100vh-112px)]'
      : layoutMode === 'sheet'
        ? 'w-full max-h-[72vh]'
        : 'w-full';

  return (
    <section
      ref={panelRef}
      aria-label={`${title} widget`}
      onMouseDown={() => {
        if (layoutMode === 'free') bringToFront(id);
      }}
      style={freeStyle}
      className={`glass-panel animate-fade-in flex flex-col overflow-hidden text-[var(--text)] ${containerClasses}`}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2 select-none ${
          layoutMode === 'free' ? 'cursor-grab active:cursor-grabbing' : ''
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
              label={widget.minimized ? `Expand ${title}` : `Minimize ${title}`}
              onClick={() => toggleMinimizeWidget(id)}
            >
              {widget.minimized ? (
                <Maximize2 size={16} strokeWidth={1.5} />
              ) : (
                <Minimize2 size={16} strokeWidth={1.5} />
              )}
            </IconButton>
          )}
          <IconButton label={`Close ${title}`} onClick={() => setWidgetVisible(id, false)}>
            <X size={16} strokeWidth={1.5} />
          </IconButton>
        </div>
      </div>

      {(!widget.minimized || layoutMode === 'sheet') && (
        <div className="overflow-y-auto p-[var(--space-4)]">{children}</div>
      )}
    </section>
  );
}
