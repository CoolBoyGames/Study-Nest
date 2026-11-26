import { useEffect, useRef } from 'react';
import { GRADIENT_PRESETS } from '../../constants/backgrounds';
import { Z_BACKGROUND, Z_OVERLAY } from '../../constants/zIndex';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useToastStore } from '../../stores/useToastStore';

export function BackgroundLayer() {
  const background = useSettingsStore((s) => s.background);
  const pushToast = useToastStore((s) => s.push);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Pause video backgrounds when tab is hidden to save battery/CPU
  useEffect(() => {
    const handleVisibility = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) {
        video.pause();
      } else {
        void video.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [background.kind, background.videoUrl]);

  const preset =
    GRADIENT_PRESETS.find((p) => p.id === background.presetId) ?? GRADIENT_PRESETS[0];

  const hasImage = background.kind === 'image' && background.imageUrl.trim().length > 0;
  const hasVideo = background.kind === 'video' && background.videoUrl.trim().length > 0;

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          zIndex: Z_BACKGROUND,
          background: !hasImage && !hasVideo ? preset?.css : 'var(--bg)',
        }}
        className="fixed inset-0 overflow-hidden transition-[background] duration-300"
      >
        {hasImage && (
          <img
            src={background.imageUrl}
            alt=""
            className="h-full w-full object-cover"
            onError={() => {
              pushToast('Background image could not be loaded.', 'warning');
            }}
          />
        )}

        {hasVideo && (
          <video
            ref={videoRef}
            src={background.videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover"
            onError={() => {
              pushToast('Background video could not be loaded.', 'warning');
            }}
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
        }}
        className="pointer-events-none fixed inset-0 transition-colors duration-200"
      />
    </>
  );
}
