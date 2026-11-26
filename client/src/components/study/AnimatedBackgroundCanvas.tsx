import { useEffect, useRef } from 'react';
import type { AnimatedBgId } from '@studyspace/shared';

export interface AnimatedBackgroundCanvasProps {
  kind: AnimatedBgId;
  intensity: number;
  paused: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
}

function createParticles(kind: AnimatedBgId, count: number): Particle[] {
  const list: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const seed = (i * 9301 + 49297) % 233280;
    const r1 = seed / 233280;
    const r2 = ((i * 1597 + 13171) % 104729) / 104729;
    const r3 = ((i * 2791 + 7919) % 65521) / 65521;

    if (kind === 'rain-glass') {
      list.push({
        x: r1,
        y: r2,
        vx: -0.02,
        vy: 0.45 + r3 * 0.45,
        size: 12 + r3 * 18,
        alpha: 0.16 + r3 * 0.25,
        phase: r1 * Math.PI * 2,
      });
    } else if (kind === 'snowfall') {
      list.push({
        x: r1,
        y: r2,
        vx: (r3 - 0.5) * 0.04,
        vy: 0.04 + r2 * 0.06,
        size: 1.5 + r3 * 3.5,
        alpha: 0.25 + r1 * 0.45,
        phase: r3 * Math.PI * 2,
      });
    } else if (kind === 'starfield') {
      list.push({
        x: r1,
        y: r2,
        vx: 0,
        vy: -0.004 - r3 * 0.006,
        size: 0.8 + r3 * 2,
        alpha: 0.2 + r1 * 0.6,
        phase: r2 * Math.PI * 2,
      });
    } else if (kind === 'clouds') {
      list.push({
        x: r1,
        y: 0.1 + r2 * 0.75,
        vx: 0.008 + r3 * 0.012,
        vy: 0,
        size: 120 + r3 * 180,
        alpha: 0.12 + r1 * 0.12,
        phase: r2 * Math.PI * 2,
      });
    } else {
      // bokeh / aurora / gradient-mesh orbs
      list.push({
        x: r1,
        y: r2,
        vx: (r3 - 0.5) * 0.014,
        vy: (r1 - 0.5) * 0.012,
        size: kind === 'bokeh' ? 24 + r3 * 52 : 180 + r3 * 220,
        alpha: kind === 'bokeh' ? 0.1 + r1 * 0.16 : 0.24 + r2 * 0.15,
        phase: r3 * Math.PI * 2,
      });
    }
  }
  return list;
}

export function AnimatedBackgroundCanvas({
  kind,
  intensity,
  paused,
}: AnimatedBackgroundCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const factor = Math.max(0.15, Math.min(1, intensity / 100));
    const baseCount =
      kind === 'rain-glass' || kind === 'starfield' || kind === 'snowfall'
        ? Math.round(35 + factor * 85)
        : Math.round(5 + factor * 10);
    const particles = createParticles(kind, baseCount);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    let rafId = 0;
    let lastFrame = 0;
    const minInterval = 1000 / 30; // Strict <= 30 fps cap

    const renderFrame = (timeMs: number, dt: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const tSec = timeMs / 1000;

      // Backdrop base fill per effect mood
      if (kind === 'rain-glass') {
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#1e2c3d');
        g.addColorStop(0.55, '#34495e');
        g.addColorStop(1, '#182433');
        ctx.fillStyle = g;
      } else if (kind === 'aurora') {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#0f1c30');
        g.addColorStop(1, '#193545');
        ctx.fillStyle = g;
      } else if (kind === 'clouds') {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#a8c6e8');
        g.addColorStop(1, '#dce9f7');
        ctx.fillStyle = g;
      } else if (kind === 'starfield') {
        const g = ctx.createRadialGradient(w * 0.5, h * 0.35, 20, w * 0.5, h * 0.5, Math.max(w, h));
        g.addColorStop(0, '#182442');
        g.addColorStop(1, '#090e1a');
        ctx.fillStyle = g;
      } else if (kind === 'bokeh') {
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#232b42');
        g.addColorStop(1, '#181e30');
        ctx.fillStyle = g;
      } else if (kind === 'snowfall') {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#3a4e66');
        g.addColorStop(1, '#68829e');
        ctx.fillStyle = g;
      } else {
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#dce8f9');
        g.addColorStop(0.5, '#e6f0ea');
        g.addColorStop(1, '#ebe4f5');
        ctx.fillStyle = g;
      }
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!;
        if (!paused) {
          p.x = (p.x + p.vx * dt + 1) % 1;
          p.y = (p.y + p.vy * dt + 1) % 1;
        }
        const px = p.x * w;
        const py = p.y * h;
        const alpha = p.alpha * factor;

        if (kind === 'rain-glass') {
          ctx.strokeStyle = `rgba(210, 232, 255, ${alpha})`;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + p.vx * 180, py + p.size);
          ctx.stroke();
        } else if (kind === 'snowfall') {
          const drift = Math.sin(tSec + p.phase) * 8;
          ctx.fillStyle = `rgba(244, 248, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px + drift, py, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (kind === 'starfield') {
          const twinkle = 0.55 + 0.45 * Math.sin(tSec * 1.4 + p.phase);
          ctx.fillStyle = `rgba(232, 240, 255, ${alpha * twinkle})`;
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (kind === 'clouds') {
          const rg = ctx.createRadialGradient(px, py, 0, px, py, p.size);
          rg.addColorStop(0, `rgba(255, 255, 255, ${Math.min(0.45, alpha * 1.8)})`);
          rg.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (kind === 'aurora') {
          const hue = i % 2 === 0 ? '92, 210, 178' : '116, 152, 245';
          const rx = px + Math.sin(tSec * 0.25 + p.phase) * 45;
          const ry = h * (0.25 + (i % 3) * 0.14);
          const rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, p.size * 1.3);
          rg.addColorStop(0, `rgba(${hue}, ${alpha})`);
          rg.addColorStop(1, `rgba(${hue}, 0)`);
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(rx, ry, p.size * 1.3, 0, Math.PI * 2);
          ctx.fill();
        } else if (kind === 'bokeh') {
          const color = i % 3 === 0 ? '186, 214, 255' : i % 3 === 1 ? '245, 210, 170' : '168, 224, 210';
          ctx.fillStyle = `rgba(${color}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // gradient-mesh
          const meshColors = ['142, 184, 242', '156, 214, 188', '196, 176, 238'];
          const color = meshColors[i % meshColors.length]!;
          const rg = ctx.createRadialGradient(px, py, 0, px, py, p.size);
          rg.addColorStop(0, `rgba(${color}, ${Math.min(0.55, alpha * 1.4)})`);
          rg.addColorStop(1, `rgba(${color}, 0)`);
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const tick = (now: number) => {
      if (paused || document.hidden) {
        return;
      }
      if (now - lastFrame >= minInterval) {
        const dt = lastFrame === 0 ? 0.016 : Math.min(0.1, (now - lastFrame) / 1000);
        lastFrame = now;
        renderFrame(now, dt);
      }
      rafId = window.requestAnimationFrame(tick);
    };

    // Always draw one clean initial frame
    renderFrame(performance.now(), 0);
    if (!paused && !document.hidden) {
      rafId = window.requestAnimationFrame(tick);
    }

    const onVisibility = () => {
      window.cancelAnimationFrame(rafId);
      if (!paused && !document.hidden) {
        lastFrame = 0;
        rafId = window.requestAnimationFrame(tick);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intensity, kind, paused]);

  return <canvas ref={canvasRef} className="block h-full w-full" />;
}

export default AnimatedBackgroundCanvas;
