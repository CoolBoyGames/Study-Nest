export type SpotifyResourceType =
  | 'track'
  | 'album'
  | 'playlist'
  | 'episode'
  | 'show'
  | 'artist';

export interface ParsedSpotifyLink {
  type: SpotifyResourceType;
  id: string;
  embedUrl: string;
}

const VALID_TYPES = new Set<SpotifyResourceType>([
  'track',
  'album',
  'playlist',
  'episode',
  'show',
  'artist',
]);

export function parseSpotifyUrl(raw: string): ParsedSpotifyLink | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Support spotify:<type>:<id> URI format
  const uriMatch = /^spotify:(track|album|playlist|episode|show|artist):([A-Za-z0-9]+)$/i.exec(
    trimmed
  );
  if (uriMatch) {
    const type = uriMatch[1]?.toLowerCase() as SpotifyResourceType | undefined;
    const id = uriMatch[2];
    if (type && id && VALID_TYPES.has(type)) {
      return {
        type,
        id,
        embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator`,
      };
    }
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }
    if (url.hostname !== 'open.spotify.com' && url.hostname !== 'play.spotify.com') {
      return null;
    }

    // Handle optional locale segment like /intl-en/track/<id> or /embed/track/<id>
    const segments = url.pathname.split('/').filter(Boolean);
    const cleaned = segments.filter((seg) => seg !== 'embed' && !seg.startsWith('intl-'));
    const type = cleaned[0]?.toLowerCase() as SpotifyResourceType | undefined;
    const id = cleaned[1];

    if (!type || !id || !VALID_TYPES.has(type) || !/^[A-Za-z0-9]+$/.test(id)) {
      return null;
    }

    return {
      type,
      id,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator`,
    };
  } catch {
    return null;
  }
}

export const SAMPLE_STUDY_PLAYLIST =
  'https://open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS';
