import { format, type Locale } from 'date-fns';
import { enUS, id } from 'date-fns/locale';

const LOCALES: Readonly<Record<string, Locale>> = { en: enUS, id };

/** date-fns locale for an app language code ('id', 'en', 'id-ID'); English otherwise. */
export function dateLocale(language: string): Locale {
  return LOCALES[language.split('-')[0] ?? ''] ?? enUS;
}

/** Locale-aware date and time, e.g. "7 Nov 2026, 14.05" (id) or "Nov 7, 2026, 2:05 PM" (en). */
export function formatDateTime(epochMs: number, language: string): string {
  return format(epochMs, 'PPp', { locale: dateLocale(language) });
}
