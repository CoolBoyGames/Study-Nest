import { describe, expect, it } from 'vitest';
import {
  migratePersistedSettings,
  SETTINGS_STORAGE_KEY,
  useSettingsStore,
} from '../stores/useSettingsStore';
import { en } from './en';
import { interpolate, translate } from './translate';
import { vi } from './vi';

describe('i18n dictionaries and translation helpers', () => {
  it('ensures every English key exists in Vietnamese with matching interpolation variables', () => {
    const enKeys = Object.keys(en) as Array<keyof typeof en>;
    const viKeys = Object.keys(vi);
    expect(viKeys.sort()).toEqual([...enKeys].sort());

    const placeholderRe = /\{\{(\w+)\}\}/g;
    for (const key of enKeys) {
      expect(vi[key].trim().length, `vi['${key}'] must be non-empty`).toBeGreaterThan(0);
      const enVars = Array.from(en[key].matchAll(placeholderRe), (m) => m[1]).sort();
      const viVars = Array.from(vi[key].matchAll(placeholderRe), (m) => m[1]).sort();
      expect(viVars, `Mismatched placeholders for '${key}'`).toEqual(enVars);
    }
  });

  it('interpolates variables in both English and Vietnamese', () => {
    expect(interpolate('Hello {{name}}, {{count}} left', { name: 'An', count: 3 })).toBe(
      'Hello An, 3 left'
    );
    expect(translate('en', 'notes.words', { count: 42 })).toBe('42 words');
    expect(translate('vi', 'notes.words', { count: 42 })).toBe('42 từ');
  });

  it('migrates v1 settings safely and persists locale selection', () => {
    const migrated = migratePersistedSettings({ version: 1, theme: 'dusk' }, 1280, 800);
    expect(migrated.version).toBe(2);
    expect(migrated.locale).toBe('en');
    expect(migrated.theme).toBe('dusk');
    expect(migrated.widgets.clock.height).toBeGreaterThan(0);

    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', {
      value: {
        innerWidth: 1280,
        innerHeight: 800,
        localStorage: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => store.set(k, v),
        },
      },
      configurable: true,
    });

    useSettingsStore.getState().setLocale('vi');
    expect(useSettingsStore.getState().locale).toBe('vi');
    const saved = JSON.parse(store.get(SETTINGS_STORAGE_KEY) || '{}') as { locale?: string };
    expect(saved.locale).toBe('vi');
  });
});
