import { describe, expect, it } from 'vitest';
import { parseVideoSource } from './videoSource';

describe('parseVideoSource', () => {
  it('parses direct mp4 and webm URLs with query strings and mixed case', () => {
    const validFiles = [
      'https://cdn.example.com/rain.mp4',
      'https://cdn.example.com/loops/CafeScene.WEBM?token=abc&v=2#loop',
      'http://localhost:8080/assets/fireplace.mp4',
    ];
    for (const url of validFiles) {
      expect(parseVideoSource(url)).toEqual({
        ok: true,
        source: { type: 'file', url },
      });
    }
  });

  it('parses 10+ YouTube URL variants cleanly', () => {
    const ytCases: Array<{ input: string; id: string }> = [
      { input: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', id: 'jfKfPfyJRdk' },
      { input: 'https://youtube.com/watch?v=5qap5aO4i9A&t=120s&ab_channel=Lofi', id: '5qap5aO4i9A' },
      { input: 'https://www.youtube.com/watch?feature=share&v=DWcJFNfaw9c', id: 'DWcJFNfaw9c' },
      { input: 'https://m.youtube.com/watch?v=lTRiuFIWV54&list=RDlTRiuFIWV54', id: 'lTRiuFIWV54' },
      { input: 'https://music.youtube.com/watch?v=_ITiwPMUzho&si=xyz', id: '_ITiwPMUzho' },
      { input: 'https://youtu.be/jfKfPfyJRdk', id: 'jfKfPfyJRdk' },
      { input: 'https://youtu.be/5qap5aO4i9A?si=share123&t=45', id: '5qap5aO4i9A' },
      { input: 'https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share', id: 'dQw4w9WgXcQ' },
      { input: 'https://www.youtube.com/live/jfKfPfyJRdk?si=live99', id: 'jfKfPfyJRdk' },
      { input: 'https://www.youtube.com/embed/5qap5aO4i9A?autoplay=1&mute=1', id: '5qap5aO4i9A' },
      { input: 'https://www.youtube-nocookie.com/embed/DWcJFNfaw9c?rel=0', id: 'DWcJFNfaw9c' },
    ];

    for (const c of ytCases) {
      expect(parseVideoSource(c.input)).toEqual({
        ok: true,
        source: {
          type: 'youtube',
          id: c.id,
          url: `https://www.youtube.com/watch?v=${c.id}`,
        },
      });
    }
  });

  it('returns descriptive errors for invalid, non-video, or unsupported URLs', () => {
    expect(parseVideoSource('').ok).toBe(false);
    expect(parseVideoSource('not a url').ok).toBe(false);
    expect(parseVideoSource('ftp://cdn.example.com/rain.mp4').ok).toBe(false);
    expect(parseVideoSource('https://example.com/page.html').ok).toBe(false);
    expect(parseVideoSource('https://youtu.be/short').ok).toBe(false);
    expect(parseVideoSource('https://www.youtube.com/watch?v=invalid').ok).toBe(false);
    expect(parseVideoSource('https://www.youtube.com/channel/UC123').ok).toBe(false);
  });
});
