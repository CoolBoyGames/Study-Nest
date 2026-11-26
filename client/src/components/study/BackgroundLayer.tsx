import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ANIMATED_PRESETS, GRADIENT_PRESETS } from '../../constants/backgrounds';
import { Z_BACKGROUND, Z_OVERLAY } from '../../constants/zIndex';
import { useT } from '../../i18n';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useToastStore } from '../../stores/useToastStore';
import { parseVideoSource } from '../../utils/videoSource';
import { YouTubeBackground } from './YouTubeBackground';

const AnimatedBackgroundCanvas = lazy(() => import('./AnimatedBackgroundCanvas'));

export function BackgroundLayer() {
  const { t } = useT();
  const background = useSettingsStore((s) => s.background);
  const animationLevel = useSettingsStore((s) => s.animationLevel);
  const updateBackground = useSettingsStore((s) => s.updateBackground);
  const revertBackground = useSettingsStore((s) => s.revertBackground);
  const pushToast = useToastStore((s) => s.push);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [videoReadyUrl, setVideoReadyUrl] = useState('');
  const [osReducedMotion, setOsReducedMotion] = useState(() =>
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  );

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = () => setOsReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const reducedMotion = osReducedMotion || animationLevel === 'off';

  // Auto-rotate gradient or animated presets cleanly every N minutes
  useEffect(() => {
    const mins = background.autoRotateMinutes ?? 0;
    if (!mins || (background.kind !== 'gradient' && background.kind !== 'animated')) {
      return;
    }
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      if (background.kind === 'gradient') {
        const idx = GRADIENT_PRESETS.findIndex((p) => p.id === background.presetId);
        const next = GRADIENT_PRESETS[(idx + 1) % GRADIENT_PRESETS.length];
        if (next) updateBackground({ presetId: next.id });
      } else if (background.kind === 'animated') {
        const idx = ANIMATED_PRESETS.findIndex((p) => p.id === background.animatedId);
        const next = ANIMATED_PRESETS[(idx + 1) % ANIMATED_PRESETS.length];
        if (next) updateBackground({ animatedId: next.id });
      }
    }, mins * 60_000);
    return () => window.clearInterval(timer);
  }, [
    background.animatedId,
    background.autoRotateMinutes,
    background.kind,
    background.presetId,
    updateBackground,
  ]);

  const parsedVideo =
    background.kind === 'video' && background.videoUrl.trim()
      ? parseVideoSource(background.videoUrl)
      : null;

  const isFileVideo = Boolean(parsedVideo?.ok && parsedVideo.source.type === 'file');
  const isYouTubeVideo = Boolean(parsedVideo?.ok && parsedVideo.source.type === 'youtube');
  const activeVideoUrl = parsedVideo?.ok ? parsedVideo.source.url : '';
  const youtubeId =
    parsedVideo?.ok && parsedVideo.source.type === 'youtube' ? parsedVideo.source.id : undefined;

  // Pause HTML5 video on tab hidden or reduced-motion; retry blocked autoplay on user gesture
  useEffect(() => {
    if (!isFileVideo) return;
    const video = videoRef.current;
    if (!video) return;

    let gestureCleanup: (() => void) | null = null;

    const tryPlay = () => {
      if (reducedMotion || document.hidden) {
        video.pause();
        return;
      }
      void video.play().catch(() => {
        if (gestureCleanup) return;
        const onInteract = () => {
          gestureCleanup?.();
          gestureCleanup = null;
          if (!reducedMotion && !document.hidden) {
            void video.play().catch(() => {});
          }
        };
        window.addEventListener('pointerdown', onInteract, { once: true, capture: true });
        window.addEventListener('keydown', onInteract, { once: true, capture: true });
        gestureCleanup = () => {
          window.removeEventListener('pointerdown', onInteract, true);
          window.removeEventListener('keydown', onInteract, true);
        };
      });
    };

    tryPlay();

    const handleVisibility = () => {
      if (document.hidden || reducedMotion) {
        video.pause();
      } else {
        tryPlay();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      gestureCleanup?.();
    };
  }, [activeVideoUrl, isFileVideo, reducedMotion]);

  const handleYouTubeError = useCallback(
    (code?: number) => {
      if (code === 101 || code === 150) {
        pushToast(t('appearance.videoBlocked', { code }), 'warning');
      } else {
        pushToast(t('appearance.videoLoadError'), 'warning');
      }
      revertBackground();
    },
    [pushToast, revertBackground, t]
  );

  const preset =
    GRADIENT_PRESETS.find((p) => p.id === background.presetId) ?? GRADIENT_PRESETS[0];

  const hasImage = background.kind === 'image' && background.imageUrl.trim().length > 0;
  const hasAnimated = background.kind === 'animated';
  const videoReady = isFileVideo && videoReadyUrl === activeVideoUrl;
  const brightness = background.brightnessPercent ?? 100;
  const vignette = background.vignettePercent ?? 0;

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          zIndex: Z_BACKGROUND,
          background: preset?.css ?? 'var(--bg)',
          filter: brightness !== 100 ? `brightness(${brightness}%)` : undefined,
        }}
        className="fixed inset-0 overflow-hidden transition-[background,filter] duration-300"
      >
        {hasAnimated && (
          <Suspense fallback={null}>
            <AnimatedBackgroundCanvas
              kind={background.animatedId ?? 'aurora'}
              intensity={background.animatedIntensity ?? 60}
              paused={reducedMotion}
            />
          </Suspense>
        )}

        {hasImage && (
          <img
            src={background.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-opacity duration-300"
            onError={() => {
              pushToast('Background image could not be loaded.', 'warning');
              revertBackground();
            }}
          />
        )}

        {isFileVideo && (
          <video
            key={activeVideoUrl}
            ref={videoRef}
            src={activeVideoUrl}
            autoPlay={!reducedMotion}
            loop
            muted
            playsInline
            preload="auto"
            onCanPlay={() => setVideoReadyUrl(activeVideoUrl)}
            onError={() => {
              pushToast(t('appearance.videoLoadError'), 'warning');
              revertBackground();
            }}
            className={`h-full w-full object-cover transition-opacity duration-500 ${
              videoReady ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {isYouTubeVideo && youtubeId && (
          <YouTubeBackground
            key={youtubeId}
            videoId={youtubeId}
            reducedMotion={reducedMotion}
            onErrorFallback={handleYouTubeError}
          />
        )}
      </div>

      <div
        aria-hidden="true"
        style={{
          zIndex: Z_OVERLAY,
          backdropFilter: background.blurPx > 0 ? `blur(${background.blurPx}px)` : undefined,
          WebkitBackdropFilter:
            background.blurPx > 0 ? `blur(${background.blurPx}px)` : undefined,
          backgroundColor:
            background.dimPercent > 0
              ? `rgba(10, 14, 24, ${background.dimPercent / 100})`
              : 'transparent',
          backgroundImage:
            vignette > 0
              ? `radial-gradient(circle at center, transparent 42%, rgba(6, 10, 18, ${(
                  vignette / 100
                ).toFixed(2)}) 100%)`
              : undefined,
        }}
        className="pointer-events-none fixed inset-0 transition-colors duration-200"
      >
        {background.filmGrain && (
          <div className="film-grain-overlay pointer-events-none absolute inset-0" />
        )}
      </div>
    </>
  );
}
