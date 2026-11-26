import type { AccentId, ThemeId } from '@studyspace/shared';

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  mood: string;
  swatchBg: string;
  swatchPrimary: string;
}

export interface AccentMeta {
  id: AccentId;
  label: string;
  swatch: string;
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'mild-blue',
    label: 'Mild Blue',
    mood: 'Calm & airy',
    swatchBg: '#EAF2FB',
    swatchPrimary: '#3A6BB5',
  },
  {
    id: 'sage',
    label: 'Sage',
    mood: 'Natural & soft',
    swatchBg: '#EBF3EE',
    swatchPrimary: '#3F7358',
  },
  {
    id: 'dusk',
    label: 'Dusk',
    mood: 'Warm evening',
    swatchBg: '#2A2D43',
    swatchPrimary: '#8E9AF0',
  },
  {
    id: 'paper-light',
    label: 'Paper Light',
    mood: 'Bright & print-like',
    swatchBg: '#FAF8F3',
    swatchPrimary: '#426599',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    mood: 'Deep focus',
    swatchBg: '#0F1626',
    swatchPrimary: '#6C9CFF',
  },
  {
    id: 'lavender',
    label: 'Lavender',
    mood: 'Gentle & contemplative',
    swatchBg: '#F1EEF9',
    swatchPrimary: '#5E4EA3',
  },
  {
    id: 'warm-sand',
    label: 'Warm Sand',
    mood: 'Sunlit linen',
    swatchBg: '#F5EFE4',
    swatchPrimary: '#825629',
  },
  {
    id: 'ocean-teal',
    label: 'Ocean Teal',
    mood: 'Crisp coastal calm',
    swatchBg: '#E7F3F3',
    swatchPrimary: '#266B70',
  },
  {
    id: 'rose-quartz',
    label: 'Rose Quartz',
    mood: 'Soft blush warmth',
    swatchBg: '#F6EDED',
    swatchPrimary: '#8F4556',
  },
  {
    id: 'auto',
    label: 'Auto (Time of day)',
    mood: 'Day, dusk & night shift',
    swatchBg: 'linear-gradient(135deg, #EAF2FB 0%, #2A2D43 50%, #0F1626 100%)',
    swatchPrimary: '#5B8DD6',
  },
];

export const ACCENT_SWATCHES: AccentMeta[] = [
  { id: 'cobalt', label: 'Cobalt', swatch: '#3461AD' },
  { id: 'indigo', label: 'Indigo', swatch: '#4E4CB5' },
  { id: 'emerald', label: 'Emerald', swatch: '#2C7353' },
  { id: 'teal', label: 'Teal', swatch: '#246C75' },
  { id: 'amber', label: 'Amber', swatch: '#8F5314' },
  { id: 'rose', label: 'Rose', swatch: '#993D54' },
  { id: 'plum', label: 'Plum', swatch: '#6F4696' },
  { id: 'slate', label: 'Slate', swatch: '#44556B' },
];

export function resolveEffectiveTheme(
  theme: ThemeId,
  now: Date = new Date()
): Exclude<ThemeId, 'auto'> {
  if (theme !== 'auto') return theme;
  const hour = now.getHours();
  if (hour >= 7 && hour < 18) return 'mild-blue';
  if (hour >= 18 && hour < 21) return 'dusk';
  return 'midnight';
}

export function getInitialTheme(): ThemeId {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dusk';
  }
  return 'mild-blue';
}
