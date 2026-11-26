import { useEffect, useRef, useState } from 'react';

interface YtPlayerInstance {
  mute: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
}

interface YtNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (ev: { target: YtPlayerInstance }) => void;
        onStateChange?: (ev: { target: YtPlayerInstance; data: number }) => void;
        onError?: (ev: { data: number }) => void;
      };
    }
  ) => YtPlayerInstance;
  PlayerState?: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
  };
}

declare global {
  interface Window {
    YT?: YtNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<YtNamespace> | null = null;

function loadYouTubeApi(): Promise<YtNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('No window environment'));
  }
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<YtNamespace>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    const timer = window.setTimeout(() => {
      ytApiPromise = null;
      reject(new Error('YouTube IFrame API load timeout'));
    }, 8000);

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timer);
      prevReady?.();
      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        ytApiPromise = null;
        reject(new Error('YouTube IFrame API failed to initialize'));
      }
    };

    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timer);
        ytApiPromise = null;
        reject(new Error('Failed to load YouTube IFrame API'));
      };
      document.head.appendChild(script);
    }
  });

  return ytApiPromise;
}

function computeCoverDimensions(vw: number, vh: number): { width: number; height: number } {
  const targetAspect = 16 / 9;
  const viewAspect = vw / Math.max(1, vh);
  if (viewAspect > targetAspect) {
    return { width: Math.ceil(vw), height: Math.ceil(vw / targetAspect) };
  }
  return { width: Math.ceil(vh * targetAspect), height: Math.ceil(vh) };
}

export interface YouTubeBackgroundProps {
  videoId: string;
  reducedMotion: boolean;
  onErrorFallback: (code?: number) => void;
}

export function YouTubeBackground({
  videoId,
  reducedMotion,
  onErrorFallback,
}: YouTubeBackgroundProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YtPlayerInstance | null>(null);
  const [playingVisible, setPlayingVisible] = useState(false);
  const [coverSize, setCoverSize] = useState(() =>
    typeof window !== 'undefined'
      ? computeCoverDimensions(window.innerWidth, window.innerHeight)
      : { width: 1280, height: 720 }
  );

  // Keep 16:9 cover math synced with viewport size
  useEffect(() => {
    const onResize = () => {
      setCoverSize(computeCoverDimensions(window.innerWidth, window.innerHeight));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Initialize official YouTube IFrame Player API
  useEffect(() => {
    let cancelled = false;
    let interactionCleanup: (() => void) | null = null;
    const host = hostRef.current;
    if (!host) return;

    const resetTimer = window.requestAnimationFrame(() => {
      if (!cancelled) setPlayingVisible(false);
    });

    void loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !hostRef.current) return;

        // Clear any leftover mount node before constructing player
        hostRef.current.innerHTML = '';
        const mountEl = document.createElement('div');
        hostRef.current.appendChild(mountEl);

        const player = new YT.Player(mountEl, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: reducedMotion ? 0 : 1,
            mute: 1,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            loop: 1,
            playlist: videoId,
            fs: 0,
            iv_load_policy: 3,
            origin: window.location.origin,
          },
          events: {
            onReady: (ev) => {
              if (cancelled) return;
              ev.target.mute();
              if (reducedMotion || document.hidden) {
                ev.target.pauseVideo();
                setPlayingVisible(true);
                return;
              }
              ev.target.playVideo();

              // Fallback: if autoplay is blocked by browser policy, play on first user gesture
              const retryPlay = () => {
                if (!cancelled && !document.hidden && !reducedMotion) {
                  ev.target.mute();
                  ev.target.playVideo();
                }
                cleanupInteraction();
              };
              const cleanupInteraction = () => {
                window.removeEventListener('pointerdown', retryPlay, true);
                window.removeEventListener('keydown', retryPlay, true);
              };
              window.addEventListener('pointerdown', retryPlay, { once: true, capture: true });
              window.addEventListener('keydown', retryPlay, { once: true, capture: true });
              interactionCleanup = cleanupInteraction;
            },
            onStateChange: (ev) => {
              if (cancelled) return;
              const endedCode = YT.PlayerState?.ENDED ?? 0;
              const playingCode = YT.PlayerState?.PLAYING ?? 1;
              if (ev.data === playingCode) {
                setPlayingVisible(true);
              } else if (ev.data === endedCode && !reducedMotion && !document.hidden) {
                ev.target.seekTo(0, true);
                ev.target.playVideo();
              }
            },
            onError: (ev) => {
              if (!cancelled) {
                onErrorFallback(ev.data);
              }
            },
          },
        });

        playerRef.current = player;
      })
      .catch(() => {
        if (!cancelled) onErrorFallback();
      });

    const handleVisibility = () => {
      const player = playerRef.current;
      if (!player) return;
      if (document.hidden || reducedMotion) {
        player.pauseVideo();
      } else {
        player.mute();
        player.playVideo();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(resetTimer);
      document.removeEventListener('visibilitychange', handleVisibility);
      interactionCleanup?.();
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore destroy cleanup errors
      }
      playerRef.current = null;
    };
  }, [onErrorFallback, reducedMotion, videoId]);

  return (
    <div
      style={{
        width: `${coverSize.width}px`,
        height: `${coverSize.height}px`,
      }}
      className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500 ${
        playingVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div ref={hostRef} className="h-full w-full" />
    </div>
  );
}
