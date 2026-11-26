import { useEffect, useRef } from 'react';
import { CloudRain, Coffee, Volume2, VolumeX, Wind } from 'lucide-react';
import type { AmbientChannelId } from '@studyspace/shared';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useToastStore } from '../../stores/useToastStore';
import { Button, IconButton, Slider } from '../ui';

interface ChannelMeta {
  id: AmbientChannelId;
  label: string;
  src: string;
  icon: typeof CloudRain;
}

const BASE = import.meta.env.BASE_URL;

const CHANNELS: ChannelMeta[] = [
  { id: 'rain', label: 'Soft Rain', src: `${BASE}audio/rain.wav`, icon: CloudRain },
  { id: 'cafe', label: 'Warm Cafe', src: `${BASE}audio/cafe.wav`, icon: Coffee },
  { id: 'white-noise', label: 'White Noise', src: `${BASE}audio/white-noise.wav`, icon: Wind },
];

export function AmbientSoundsWidget() {
  const ambient = useSettingsStore((s) => s.ambient);
  const toggleAmbientChannel = useSettingsStore((s) => s.toggleAmbientChannel);
  const setAmbientVolume = useSettingsStore((s) => s.setAmbientVolume);
  const pushToast = useToastStore((s) => s.push);

  const audioRefs = useRef<Partial<Record<AmbientChannelId, HTMLAudioElement>>>({});

  useEffect(() => {
    for (const ch of CHANNELS) {
      const el = audioRefs.current[ch.id];
      if (!el) continue;
      const state = ambient[ch.id];
      el.volume = state.volume;
      if (state.playing && el.paused) {
        void el.play().catch(() => {
          pushToast(`Unable to play ${ch.label.toLowerCase()} audio.`, 'warning');
          toggleAmbientChannel(ch.id);
        });
      } else if (!state.playing && !el.paused) {
        el.pause();
      }
    }
  }, [ambient, pushToast, toggleAmbientChannel]);

  const anyPlaying = CHANNELS.some((c) => ambient[c.id].playing);

  const stopAll = () => {
    for (const ch of CHANNELS) {
      if (ambient[ch.id].playing) {
        toggleAmbientChannel(ch.id);
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {CHANNELS.map((ch) => {
        const Icon = ch.icon;
        const state = ambient[ch.id];
        const pct = Math.round(state.volume * 100);

        return (
          <div
            key={ch.id}
            className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
          >
            <audio
              ref={(node) => {
                if (node) audioRefs.current[ch.id] = node;
              }}
              src={ch.src}
              loop
              preload="none"
            />

            <IconButton
              label={state.playing ? `Pause ${ch.label}` : `Play ${ch.label}`}
              active={state.playing}
              onClick={() => toggleAmbientChannel(ch.id)}
            >
              <Icon size={18} strokeWidth={1.5} />
            </IconButton>

            <div className="flex-1">
              <Slider
                label={ch.label}
                min={0}
                max={100}
                value={pct}
                displayValue={`${pct}%`}
                onChange={(val) => setAmbientVolume(ch.id, val / 100)}
              />
            </div>

            <span className="text-[var(--text-muted)]" aria-hidden="true">
              {state.playing && pct > 0 ? (
                <Volume2 size={16} strokeWidth={1.5} />
              ) : (
                <VolumeX size={16} strokeWidth={1.5} />
              )}
            </span>
          </div>
        );
      })}

      {anyPlaying && (
        <Button variant="ghost" size="sm" onClick={stopAll} className="self-end">
          Pause all sounds
        </Button>
      )}
    </div>
  );
}
