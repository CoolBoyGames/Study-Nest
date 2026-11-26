import { useState, type FormEvent } from 'react';
import { Music, Trash2 } from 'lucide-react';
import { useT } from '../../i18n';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useToastStore } from '../../stores/useToastStore';
import { parseSpotifyUrl, SAMPLE_STUDY_PLAYLIST } from '../../utils/spotify';
import { Button, EmptyState, IconButton, Input } from '../ui';

export function SpotifyWidget() {
  const { t } = useT();
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
      setError(t('spotify.invalidLink'));
      return;
    }
    setError('');
    setSpotifyUrl(draft.trim());
    pushToast(t('spotify.updated'), 'success');
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

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 items-start gap-2 border-b border-[var(--border)] px-3 py-2"
      >
        <div className="min-w-0 flex-1">
          <Input
            aria-label={t('spotify.linkAria')}
            placeholder="https://open.spotify.com/playlist/..."
            value={draft}
            error={error}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError('');
            }}
          />
        </div>
        <Button type="submit" variant="primary" size="sm">
          {t('spotify.load')}
        </Button>
        {spotifyUrl && (
          <IconButton label={t('spotify.clear')} onClick={handleClear}>
            <Trash2 size={16} strokeWidth={1.5} />
          </IconButton>
        )}
      </form>

      {parsed ? (
        <div className="relative min-h-[152px] w-full flex-1 overflow-hidden rounded-b-[calc(var(--radius-md)-1px)] bg-[var(--surface)]">
          <iframe
            title="Spotify player"
            src={parsed.embedUrl}
            width="100%"
            height="100%"
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            className="block h-full w-full border-0"
          />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-4">
          <EmptyState
            icon={<Music size={24} strokeWidth={1.5} />}
            message={t('spotify.empty')}
            actionLabel={t('spotify.sampleBtn')}
            onAction={handleUseSample}
          />
        </div>
      )}
    </div>
  );
}

export default SpotifyWidget;
