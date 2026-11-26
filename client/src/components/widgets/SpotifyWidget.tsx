import { useState, type FormEvent } from 'react';
import { Music, Trash2 } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useToastStore } from '../../stores/useToastStore';
import { parseSpotifyUrl, SAMPLE_STUDY_PLAYLIST } from '../../utils/spotify';
import { Button, EmptyState, IconButton, Input } from '../ui';

export function SpotifyWidget() {
  const spotifyUrl = useSettingsStore((s) => s.spotifyUrl);
  const setSpotifyUrl = useSettingsStore((s) => s.setSpotifyUrl);
  const pushToast = useToastStore((s) => s.push);

  const [draft, setDraft] = useState(spotifyUrl);
  const [error, setError] = useState('');

  const parsed = parseSpotifyUrl(spotifyUrl);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = parseSpotifyUrl(draft);
    if (!next) {
      setError('Paste a valid Spotify playlist, album, or track URL.');
      return;
    }
    setError('');
    setSpotifyUrl(draft.trim());
    pushToast('Spotify embed updated.', 'success');
  };

  const handleUseSample = () => {
    setDraft(SAMPLE_STUDY_PLAYLIST);
    setError('');
    setSpotifyUrl(SAMPLE_STUDY_PLAYLIST);
  };

  const handleClear = () => {
    setDraft('');
    setError('');
    setSpotifyUrl('');
  };

  const embedHeight = parsed?.type === 'track' || parsed?.type === 'episode' ? 152 : 232;

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex items-start gap-2">
        <div className="flex-1">
          <Input
            aria-label="Spotify link"
            placeholder="https://open.spotify.com/playlist/..."
            value={draft}
            error={error}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError('');
            }}
          />
        </div>
        <Button type="submit" variant="primary">
          Load
        </Button>
        {spotifyUrl && (
          <IconButton label="Clear Spotify link" onClick={handleClear}>
            <Trash2 size={16} strokeWidth={1.5} />
          </IconButton>
        )}
      </form>

      {parsed ? (
        <div
          style={{ height: `${embedHeight}px` }}
          className="w-full overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)]"
        >
          <iframe
            title="Spotify player"
            src={parsed.embedUrl}
            width="100%"
            height={embedHeight}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            className="border-0"
          />
        </div>
      ) : (
        <EmptyState
          icon={<Music size={24} strokeWidth={1.5} />}
          message="Paste a Spotify playlist, album, or track link to listen while studying."
          actionLabel="Load calm lo-fi playlist"
          onAction={handleUseSample}
        />
      )}
    </div>
  );
}

export default SpotifyWidget;
