import { useEffect, useState } from 'react';

/**
 * Observes a container element's inline width with trailing throttling (~90ms)
 * so widgets switch structural layouts cleanly and always reflect settled size.
 */
export function useContainerWidth(
  fallback = 640
): [(node: HTMLElement | null) => void, number] {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    if (!node) return;

    let timer: number | undefined;
    let rafId: number | undefined;
    let latest = node.clientWidth || fallback;

    const commit = (next: number) => {
      const rounded = Math.round(next);
      setWidth((prev) => (Math.abs(prev - rounded) >= 4 ? rounded : prev));
    };

    rafId = window.requestAnimationFrame(() => {
      rafId = undefined;
      commit(node.clientWidth || fallback);
    });

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        if (rafId !== undefined) window.cancelAnimationFrame(rafId);
      };
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      latest = entry.contentRect.width;
      if (timer !== undefined) return;
      timer = window.setTimeout(() => {
        timer = undefined;
        rafId = window.requestAnimationFrame(() => {
          rafId = undefined;
          commit(node.clientWidth || latest);
        });
      }, 90);
    });

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (timer !== undefined) window.clearTimeout(timer);
      if (rafId !== undefined) window.cancelAnimationFrame(rafId);
    };
  }, [fallback, node]);

  return [setNode, width];
}
