import { describe, expect, it } from 'vitest';
import { parseSpotifyUrl } from './spotify';

describe('parseSpotifyUrl', () => {
  it('parses all supported open.spotify.com resource types and variants', () => {
    const validCases: Array<{ input: string; type: string; id: string }> = [
      {
        input: 'https://open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS',
        type: 'playlist',
        id: '37i9dQZF1DX8Uebhn9wzrS',
      },
      {
        input: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc123&nd=1',
        type: 'track',
        id: '4uLU6hMCjMI75M1A2tKUQC',
      },
      {
        input: 'https://open.spotify.com/album/1ATL5GLyefJaxhQzSPVrLX/',
        type: 'album',
        id: '1ATL5GLyefJaxhQzSPVrLX',
      },
      {
        input: 'https://open.spotify.com/episode/512ojhOuo1ktJprKbVcKyQ',
        type: 'episode',
        id: '512ojhOuo1ktJprKbVcKyQ',
      },
      {
        input: 'https://open.spotify.com/show/2Shpxw7dPoxRJCdfFXTWLE?si=xyz',
        type: 'show',
        id: '2Shpxw7dPoxRJCdfFXTWLE',
      },
      {
        input: 'https://open.spotify.com/artist/0TnOYISbd1XYRBk9myaseg?si=foo',
        type: 'artist',
        id: '0TnOYISbd1XYRBk9myaseg',
      },
      {
        input: 'https://open.spotify.com/intl-vi/track/4uLU6hMCjMI75M1A2tKUQC?si=123',
        type: 'track',
        id: '4uLU6hMCjMI75M1A2tKUQC',
      },
      {
        input: 'https://open.spotify.com/intl-en-GB/artist/0TnOYISbd1XYRBk9myaseg',
        type: 'artist',
        id: '0TnOYISbd1XYRBk9myaseg',
      },
      {
        input: 'https://play.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wzrS',
        type: 'playlist',
        id: '37i9dQZF1DX8Uebhn9wzrS',
      },
      {
        input: 'spotify:album:1ATL5GLyefJaxhQzSPVrLX',
        type: 'album',
        id: '1ATL5GLyefJaxhQzSPVrLX',
      },
      {
        input: 'spotify:artist:0TnOYISbd1XYRBk9myaseg',
        type: 'artist',
        id: '0TnOYISbd1XYRBk9myaseg',
      },
    ];

    for (const c of validCases) {
      expect(parseSpotifyUrl(c.input)).toEqual({
        type: c.type,
        id: c.id,
        embedUrl: `https://open.spotify.com/embed/${c.type}/${c.id}?utm_source=generator`,
      });
    }
  });

  it('rejects invalid, empty, or unsupported Spotify URLs', () => {
    expect(parseSpotifyUrl('')).toBeNull();
    expect(parseSpotifyUrl('   ')).toBeNull();
    expect(parseSpotifyUrl('https://example.com/playlist/123')).toBeNull();
    expect(parseSpotifyUrl('https://open.spotify.com/user/someone')).toBeNull();
    expect(parseSpotifyUrl('https://open.spotify.com/track/not-valid-chars!')).toBeNull();
    expect(parseSpotifyUrl('spotify:user:alice')).toBeNull();
  });
});
