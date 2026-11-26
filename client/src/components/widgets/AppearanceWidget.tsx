import { useRef, useState, type FormEvent } from 'react';
import { Check, Image as ImageIcon, Upload, Video } from 'lucide-react';
import type { BackgroundKind } from '@studyspace/shared';
import { GRADIENT_PRESETS } from '../../constants/backgrounds';
import { THEMES } from '../../constants/themes';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useToastStore } from '../../stores/useToastStore';
import { resizeImageToDataUrl } from '../../utils/imageResize';
import { Button, Input, Slider, Tabs } from '../ui';

type AppearanceTab = 'themes' | 'background';

const MAIN_TABS: { id: AppearanceTab; label: string }[] = [
  { id: 'themes', label: 'Themes' },
  { id: 'background', label: 'Background' },
];

const BG_KIND_TABS: { id: BackgroundKind; label: string }[] = [
  { id: 'gradient', label: 'Gradients' },
  { id: 'image', label: 'Image' },
  { id: 'video', label: 'Video' },
];

export function AppearanceWidget() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const background = useSettingsStore((s) => s.background);
  const updateBackground = useSettingsStore((s) => s.updateBackground);
  const pushToast = useToastStore((s) => s.push);

  const [tab, setTab] = useState<AppearanceTab>('themes');
  const [imageInput, setImageInput] = useState(
    background.imageUrl.startsWith('data:') ? '' : background.imageUrl
  );
  const [videoInput, setVideoInput] = useState(background.videoUrl);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSubmit = (e: FormEvent) => {
    e.preventDefault();
    const url = imageInput.trim();
    if (!url) return;
    updateBackground({ kind: 'image', imageUrl: url });
    pushToast('Image background applied.', 'success');
  };

  const handleVideoSubmit = (e: FormEvent) => {
    e.preventDefault();
    const url = videoInput.trim();
    if (!url) return;
    updateBackground({ kind: 'video', videoUrl: url });
    pushToast('Looping video background applied.', 'success');
  };

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      updateBackground({ kind: 'image', imageUrl: dataUrl });
      pushToast('Uploaded image set as background.', 'success');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to process image.', 'warning');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Tabs items={MAIN_TABS} value={tab} onChange={setTab} ariaLabel="Appearance section" />

      {tab === 'themes' ? (
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Color theme">
          {THEMES.map((item) => {
            const active = theme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(item.id)}
                className={`flex min-h-12 items-center justify-between gap-3 rounded-[var(--radius-sm)] border px-3 py-2 text-left transition-colors duration-150 cursor-pointer ${
                  active
                    ? 'border-[var(--primary)] bg-[var(--surface-hover)]'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-control)]"
                    style={{ backgroundColor: item.swatchBg }}
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.swatchPrimary }}
                    />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[var(--text)]">{item.label}</span>
                    <span className="text-xs text-[var(--text-muted)]">{item.mood}</span>
                  </div>
                </div>
                {active && <Check size={18} strokeWidth={2} className="text-[var(--primary)]" />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Tabs
            items={BG_KIND_TABS}
            value={background.kind}
            onChange={(kind) => updateBackground({ kind })}
            ariaLabel="Background source"
          />

          {background.kind === 'gradient' && (
            <div className="grid grid-cols-2 gap-2">
              {GRADIENT_PRESETS.map((preset) => {
                const selected = background.presetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => updateBackground({ kind: 'gradient', presetId: preset.id })}
                    className={`flex flex-col gap-1.5 rounded-[var(--radius-sm)] border p-2 text-left transition-colors cursor-pointer ${
                      selected
                        ? 'border-[var(--primary)] bg-[var(--surface-hover)]'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <div
                      className="h-10 w-full rounded-[6px] border border-[var(--border)]"
                      style={{ background: preset.preview }}
                    />
                    <span className="text-xs font-medium text-[var(--text)]">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {background.kind === 'image' && (
            <div className="flex flex-col gap-3">
              <form onSubmit={handleImageSubmit} className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Image URL"
                    placeholder="https://images.unsplash.com/..."
                    value={imageInput}
                    onChange={(e) => setImageInput(e.target.value)}
                  />
                </div>
                <Button type="submit">Apply</Button>
              </form>

              <div className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--border-control)] px-3 py-2.5">
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <ImageIcon size={16} strokeWidth={1.5} />
                  <span>Or upload a local photo</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleFileUpload(e.target.files?.[0])}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} strokeWidth={1.5} />
                  {uploading ? 'Optimizing…' : 'Upload'}
                </Button>
              </div>
            </div>
          )}

          {background.kind === 'video' && (
            <form onSubmit={handleVideoSubmit} className="flex flex-col gap-2">
              <Input
                label="Looping video URL (MP4 / WebM)"
                placeholder="https://example.com/study-rain.mp4"
                value={videoInput}
                onChange={(e) => setVideoInput(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <Video size={14} strokeWidth={1.5} />
                  Muted &amp; pauses when tab hidden
                </span>
                <Button type="submit" size="sm">
                  Apply
                </Button>
              </div>
            </form>
          )}

          <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-3">
            <Slider
              label="Backdrop blur"
              min={0}
              max={24}
              value={background.blurPx}
              displayValue={`${background.blurPx}px`}
              onChange={(blurPx) => updateBackground({ blurPx })}
            />
            <Slider
              label="Dim overlay"
              min={0}
              max={70}
              value={background.dimPercent}
              displayValue={`${background.dimPercent}%`}
              onChange={(dimPercent) => updateBackground({ dimPercent })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
