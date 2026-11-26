import type { ThemeId } from '@studyspace/shared';

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  mood: string;
  swatchBg: string;
  swatchPrimary: string;
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
];

export function getInitialTheme(): ThemeId {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dusk';
  }
  return 'mild-blue';
}
