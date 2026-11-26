import { useCallback } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import type { TranslationKey } from './en';
import { getIntlLocale, translate } from './translate';

export type { TranslationKey } from './en';
export { getIntlLocale, interpolate, translate } from './translate';

export function useT() {
  const locale = useSettingsStore((s) => s.locale);
  const intlLocale = getIntlLocale(locale);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale]
  );

  const formatDate = useCallback(
    (date: Date | number | string, options?: Intl.DateTimeFormatOptions) => {
      const d = date instanceof Date ? date : new Date(date);
      return new Intl.DateTimeFormat(intlLocale, options).format(d);
    },
    [intlLocale]
  );

  const formatTime = useCallback(
    (date: Date | number | string, options?: Intl.DateTimeFormatOptions) => {
      const d = date instanceof Date ? date : new Date(date);
      return new Intl.DateTimeFormat(intlLocale, options).format(d);
    },
    [intlLocale]
  );

  return { t, locale, intlLocale, formatDate, formatTime };
}
