export type VideoSourceType = 'file' | 'youtube';

export interface ParsedVideoSource {
  type: VideoSourceType;
  url: string;
  id?: string;
}

export type VideoParseResult =
  | { ok: true; source: ParsedVideoSource }
  | { ok: false; error: string };

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const DIRECT_VIDEO_EXT_RE = /\.(mp4|webm)$/i;

/**
 * Parses a video background input accepting direct MP4/WebM URLs or YouTube URLs
 * (watch, youtu.be, shorts, live, embed) with arbitrary query parameters.
 */
export function parseVideoSource(raw: string): VideoParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'Enter a direct MP4/WebM URL or a YouTube link.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'Invalid URL. Paste an http(s) MP4, WebM, or YouTube URL.' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, error: 'Only http:// or https:// video URLs are supported.' };
  }

  const host = parsed.hostname.toLowerCase();

  // Direct MP4 / WebM check
  if (DIRECT_VIDEO_EXT_RE.test(parsed.pathname)) {
    return {
      ok: true,
      source: {
        type: 'file',
        url: trimmed,
      },
    };
  }

  // youtu.be/<id>
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    if (YOUTUBE_ID_RE.test(id)) {
      return {
        ok: true,
        source: {
          type: 'youtube',
          id,
          url: `https://www.youtube.com/watch?v=${id}`,
        },
      };
    }
    return { ok: false, error: 'Invalid youtu.be video ID.' };
  }

  // youtube.com / www.youtube.com / m.youtube.com / music.youtube.com / youtube-nocookie.com
  const isYouTubeHost =
    host === 'youtube.com' ||
    host === 'www.youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host === 'youtube-nocookie.com' ||
    host === 'www.youtube-nocookie.com';

  if (isYouTubeHost) {
    const segments = parsed.pathname.split('/').filter(Boolean);
    let candidate = '';

    if (segments[0] === 'watch' || parsed.searchParams.has('v')) {
      candidate = parsed.searchParams.get('v') ?? '';
    } else if (
      (segments[0] === 'shorts' ||
        segments[0] === 'live' ||
        segments[0] === 'embed' ||
        segments[0] === 'v') &&
      segments[1]
    ) {
      candidate = segments[1];
    }

    if (YOUTUBE_ID_RE.test(candidate)) {
      return {
        ok: true,
        source: {
          type: 'youtube',
          id: candidate,
          url: `https://www.youtube.com/watch?v=${candidate}`,
        },
      };
    }
    return { ok: false, error: 'Could not extract an 11-character YouTube video ID.' };
  }

  return {
    ok: false,
    error: 'URL must point to an .mp4 / .webm video or a valid YouTube link.',
  };
}
