import { format, type Locale } from 'date-fns';
import { enUS, id } from 'date-fns/locale';

const LOCALES: Readonly<Record<string, Locale>> = { en: enUS, id };

/** date-fns locale for an app language code ('id', 'en', 'id-ID'); English otherwise. */
export function dateLocale(language: string): Locale {
  return LOCALES[language.split('-')[0] ?? ''] ?? enUS;
}

/** Clock style: the language's own, or forced to 12 or 24 hours (Settings > Appearance). */
export type ClockStyle = 'auto' | '12h' | '24h';

const TIME_PATTERN: Record<ClockStyle, string> = { auto: 'p', '12h': 'h:mm a', '24h': 'HH:mm' };

/** Time of day, e.g. "14.05" (id), "2:05 PM" (en), or the forced 12/24-hour form. */
export function formatTime(epochMs: number, language: string, clock: ClockStyle = 'auto'): string {
  return format(epochMs, TIME_PATTERN[clock], { locale: dateLocale(language) });
}

/** Locale-aware date and time, e.g. "7 Nov 2026, 14.05" (id) or "Nov 7, 2026, 2:05 PM" (en). */
export function formatDateTime(
  epochMs: number,
  language: string,
  clock: ClockStyle = 'auto',
): string {
  const pattern = clock === 'auto' ? 'PPp' : `PP, ${TIME_PATTERN[clock]}`;
  return format(epochMs, pattern, { locale: dateLocale(language) });
}
