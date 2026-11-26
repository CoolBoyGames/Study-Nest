import { useRef, useState, type FormEvent } from 'react';
import { Check, Image as ImageIcon, Sparkles, Upload, Video } from 'lucide-react';
import type { AnimationLevel, BackgroundKind } from '@studyspace/shared';
import { ANIMATED_PRESETS, GRADIENT_PRESETS } from '../../constants/backgrounds';
import { ACCENT_SWATCHES, THEMES } from '../../constants/themes';
import { useT } from '../../i18n';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useToastStore } from '../../stores/useToastStore';
import { resizeImageToDataUrl } from '../../utils/imageResize';
import { parseVideoSource } from '../../utils/videoSource';
import { Button, Input, Select, Slider, Tabs, Toggle } from '../ui';

type AppearanceTab = 'themes' | 'background';

export function ThemesSection() {
  const { t } = useT();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const accent = useSettingsStore((s) => s.accent);
  const setAccent = useSettingsStore((s) => s.setAccent);
  const animationLevel = useSettingsStore((s) => s.animationLevel);
  const setAnimationLevel = useSettingsStore((s) => s.setAnimationLevel);

  const motionTabs: { id: AnimationLevel; label: string }[] = [
    { id: 'off', label: t('appearance.motion.off') },
    { id: 'low', label: t('appearance.motion.low') },
    { id: 'normal', label: t('appearance.motion.normal') },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2" role="radiogroup" aria-label={t('appearance.colorThemeAria')}>
        {THEMES.map((item) => {
          const active = theme === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(item.id)}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-sm)] border px-3 py-2 text-left transition-colors duration-150 ${
                active
                  ? 'border-[var(--primary)] bg-[var(--surface-hover)]'
                  : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border-control)]"
                  style={{ background: item.swatchBg }}
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

      {/* Curated accent color swatches */}
      <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            {t('appearance.accentHeading')}
          </span>
          <Button
            variant={accent === 'default' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setAccent('default')}
          >
            {t('appearance.accentDefault')}
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8" role="radiogroup" aria-label={t('appearance.accentHeading')}>
          {ACCENT_SWATCHES.map((sw) => {
            const active = accent === sw.id;
            return (
              <button
                key={sw.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={sw.label}
                title={sw.label}
                onClick={() => setAccent(sw.id)}
                className={`flex h-10 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border transition-transform ${
                  active
                    ? 'scale-105 border-[var(--text)] ring-2 ring-[var(--primary)]'
                    : 'border-[var(--border)] hover:scale-105'
                }`}
                style={{ backgroundColor: sw.swatch }}
              >
                {active && <Check size={15} strokeWidth={2.5} className="text-white" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Animation level */}
      <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
        <span className="text-xs font-medium text-[var(--text-muted)]">
          {t('appearance.motionHeading')}
        </span>
        <Tabs
          items={motionTabs}
          value={animationLevel}
          onChange={setAnimationLevel}
          ariaLabel={t('appearance.motionHeading')}
        />
      </div>
    </div>
  );
}

export function BackgroundSection() {
  const { t } = useT();
  const background = useSettingsStore((s) => s.background);
  const updateBackground = useSettingsStore((s) => s.updateBackground);
  const applyVideoSource = useSettingsStore((s) => s.applyVideoSource);
  const pushToast = useToastStore((s) => s.push);

  const [bgTab, setBgTab] = useState<BackgroundKind>(background.kind);
  const [imageInput, setImageInput] = useState(
    background.imageUrl.startsWith('data:') ? '' : background.imageUrl
  );
  const [videoInput, setVideoInput] = useState(background.videoUrl);
  const [videoError, setVideoError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bgTabs: { id: BackgroundKind; label: string }[] = [
    { id: 'gradient', label: t('appearance.gradients') },
    { id: 'animated', label: t('appearance.animated') },
    { id: 'image', label: t('appearance.image') },
    { id: 'video', label: t('appearance.video') },
  ];

  const handleImageSubmit = (e: FormEvent) => {
    e.preventDefault();
    const url = imageInput.trim();
    if (!url) return;
    updateBackground({ kind: 'image', imageUrl: url });
    pushToast('Image background applied.', 'success');
  };

  const handleVideoSubmit = (e: FormEvent) => {
    e.preventDefault();
    const res = parseVideoSource(videoInput);
    if (!res.ok) {
      setVideoError(res.error);
      return;
    }
    setVideoError('');
    applyVideoSource(res.source.url);
    pushToast(t('appearance.videoApplied'), 'success');
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
      <Tabs
        items={bgTabs}
        value={bgTab}
        onChange={(kind) => {
          setBgTab(kind);
          if (kind === 'gradient' || kind === 'animated') {
            updateBackground({ kind });
          }
        }}
        ariaLabel={t('appearance.bgSourceAria')}
      />

      {bgTab === 'gradient' && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {GRADIENT_PRESETS.map((preset) => {
            const selected = background.kind === 'gradient' && background.presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={selected}
                onClick={() => updateBackground({ kind: 'gradient', presetId: preset.id })}
                className={`flex cursor-pointer flex-col gap-1.5 rounded-[var(--radius-sm)] border p-2 text-left transition-colors ${
                  selected
                    ? 'border-[var(--primary)] bg-[var(--surface-hover)]'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <div
                  className="h-10 w-full rounded-[6px] border border-[var(--border)]"
                  style={{ background: preset.preview }}
                />
                <span className="truncate text-xs font-medium text-[var(--text)]">{preset.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {bgTab === 'animated' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ANIMATED_PRESETS.map((preset) => {
              const selected =
                background.kind === 'animated' &&
                (background.animatedId ?? 'aurora') === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => updateBackground({ kind: 'animated', animatedId: preset.id })}
                  className={`flex cursor-pointer flex-col gap-1.5 rounded-[var(--radius-sm)] border p-2 text-left transition-colors ${
                    selected
                      ? 'border-[var(--primary)] bg-[var(--surface-hover)]'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <div
                    className="flex h-10 w-full items-center justify-end rounded-[6px] border border-[var(--border)] p-1.5 text-white/80"
                    style={{ background: preset.preview }}
                  >
                    <Sparkles size={13} strokeWidth={1.5} />
                  </div>
                  <span className="truncate text-xs font-medium text-[var(--text)]">{preset.label}</span>
                </button>
              );
            })}
          </div>
          <Slider
            label={t('appearance.intensity')}
            min={10}
            max={100}
            value={background.animatedIntensity ?? 60}
            displayValue={`${background.animatedIntensity ?? 60}%`}
            onChange={(animatedIntensity) => updateBackground({ animatedIntensity })}
          />
        </div>
      )}

      {bgTab === 'image' && (
        <div className="flex flex-col gap-3">
          <form onSubmit={handleImageSubmit} className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label={t('appearance.imageUrl')}
                placeholder="https://images.unsplash.com/..."
                value={imageInput}
                onChange={(e) => setImageInput(e.target.value)}
              />
            </div>
            <Button type="submit">{t('common.apply')}</Button>
          </form>

          <div className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--border-control)] px-3 py-2.5">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <ImageIcon size={16} strokeWidth={1.5} />
              <span>{t('appearance.uploadHint')}</span>
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
              {uploading ? t('appearance.optimizing') : t('appearance.uploadBtn')}
            </Button>
          </div>
        </div>
      )}

      {bgTab === 'video' && (
        <div className="flex flex-col gap-3">
          <form onSubmit={handleVideoSubmit} className="flex flex-col gap-2">
            <Input
              label={t('appearance.videoLabel')}
              placeholder={t('appearance.videoPlaceholder')}
              value={videoInput}
              error={videoError}
              onChange={(e) => {
                setVideoInput(e.target.value);
                if (videoError) setVideoError('');
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Video size={14} strokeWidth={1.5} />
                {t('appearance.videoHint')}
              </span>
              <Button type="submit" size="sm">
                {t('common.apply')}
              </Button>
            </div>
          </form>

          {(background.recentVideoSources?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--text-muted)]">
                {t('appearance.videoRecent')}
              </span>
              <div className="flex flex-col gap-1">
                {(background.recentVideoSources ?? []).map((src) => {
                  const active = background.videoUrl === src;
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => {
                        setVideoInput(src);
                        setVideoError('');
                        applyVideoSource(src);
                      }}
                      className={`cursor-pointer truncate rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-left text-xs transition-colors ${
                        active
                          ? 'border-[var(--primary)] bg-[var(--surface-hover)] text-[var(--text)]'
                          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      {src}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-3">
        <Slider
          label={t('appearance.blur')}
          min={0}
          max={24}
          value={background.blurPx}
          displayValue={`${background.blurPx}px`}
          onChange={(blurPx) => updateBackground({ blurPx })}
        />
        <Slider
          label={t('appearance.dim')}
          min={0}
          max={70}
          value={background.dimPercent}
          displayValue={`${background.dimPercent}%`}
          onChange={(dimPercent) => updateBackground({ dimPercent })}
        />
        <Slider
          label={t('appearance.brightness')}
          min={50}
          max={130}
          value={background.brightnessPercent ?? 100}
          displayValue={`${background.brightnessPercent ?? 100}%`}
          onChange={(brightnessPercent) => updateBackground({ brightnessPercent })}
        />
        <Slider
          label={t('appearance.vignette')}
          min={0}
          max={75}
          value={background.vignettePercent ?? 0}
          displayValue={`${background.vignettePercent ?? 0}%`}
          onChange={(vignettePercent) => updateBackground({ vignettePercent })}
        />

        <Toggle
          label={t('appearance.filmGrain')}
          checked={Boolean(background.filmGrain)}
          onChange={(filmGrain) => updateBackground({ filmGrain })}
        />

        {(background.kind === 'gradient' || background.kind === 'animated') && (
          <Select
            label={t('appearance.autoRotate')}
            value={String(background.autoRotateMinutes ?? 0)}
            onChange={(e) => updateBackground({ autoRotateMinutes: Number(e.target.value) })}
            options={[
              { value: '0', label: t('appearance.rotateOff') },
              { value: '5', label: t('appearance.rotateMins', { min: 5 }) },
              { value: '15', label: t('appearance.rotateMins', { min: 15 }) },
              { value: '30', label: t('appearance.rotateMins', { min: 30 }) },
            ]}
          />
        )}
      </div>
    </div>
  );
}

export function AppearanceWidget() {
  const { t } = useT();
  const [tab, setTab] = useState<AppearanceTab>('themes');

  const mainTabs: { id: AppearanceTab; label: string }[] = [
    { id: 'themes', label: t('appearance.themes') },
    { id: 'background', label: t('appearance.background') },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Tabs items={mainTabs} value={tab} onChange={setTab} ariaLabel={t('appearance.sectionAria')} />
      {tab === 'themes' ? <ThemesSection /> : <BackgroundSection />}
    </div>
  );
}
