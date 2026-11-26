import { describe, expect, it } from 'vitest';
import { parseSpotifyUrl } from './spotify';

describe('parseSpotifyUrl', () => {
  it('parses standard playlist, album, and track URLs', () => {
    expect(parseSpotifyUrl('https://open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS')).toEqual({
      type: 'playlist',
      id: '37i9dQZF1DX8Uebhn9wzrS',
      embedUrl:
        'https://open.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wzrS?utm_source=generator',
    });

    expect(parseSpotifyUrl('https://open.spotify.com/intl-vi/track/4uLU6hMCjMI75M1A2tKUQC?si=123')).toEqual({
      type: 'track',
      id: '4uLU6hMCjMI75M1A2tKUQC',
      embedUrl: 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC?utm_source=generator',
    });
  });

  it('parses spotify URI format', () => {
    expect(parseSpotifyUrl('spotify:album:1ATL5GLyefJaxhQzSPVrLX')).toEqual({
      type: 'album',
      id: '1ATL5GLyefJaxhQzSPVrLX',
      embedUrl: 'https://open.spotify.com/embed/album/1ATL5GLyefJaxhQzSPVrLX?utm_source=generator',
    });
  });

  it('rejects invalid or non-Spotify URLs', () => {
    expect(parseSpotifyUrl('')).toBeNull();
    expect(parseSpotifyUrl('https://example.com/playlist/123')).toBeNull();
    expect(parseSpotifyUrl('https://open.spotify.com/user/someone')).toBeNull();
  });
});
