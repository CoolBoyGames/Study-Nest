import type { LocaleId } from '@studyspace/shared';
import { en, type TranslationKey, type Translations } from './en';
import { vi } from './vi';

export const DICTS: Record<LocaleId, Translations> = { en, vi };

export function interpolate(
  template: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    const val = vars[name];
    return val === undefined ? match : String(val);
  });
}

export function translate(
  locale: LocaleId,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  const dict = DICTS[locale] ?? en;
  const template = dict[key] ?? en[key];
  return interpolate(template, vars);
}

export function getIntlLocale(locale: LocaleId): string {
  return locale === 'vi' ? 'vi-VN' : 'en-US';
}
