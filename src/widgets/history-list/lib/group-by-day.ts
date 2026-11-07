import { format, isToday, isYesterday, startOfDay } from 'date-fns';

import type { HistoryItem } from '@/entities/transaction';
import { dateLocale } from '@/shared/lib';

export type DaySection = {
  readonly key: string;
  readonly title: string;
  readonly data: HistoryItem[];
};

type DayLabels = { readonly today: string; readonly yesterday: string };

/**
 * Groups newest-first items by local calendar day. Today and yesterday get words, older days a
 * locale-aware date (e.g. "7 November 2026" in id).
 */
export function groupByDay(
  items: readonly HistoryItem[],
  language: string,
  labels: DayLabels,
): DaySection[] {
  const sections = new Map<number, DaySection>();
  for (const item of items) {
    const day = startOfDay(item.timestamp).getTime();
    let section = sections.get(day);
    if (section === undefined) {
      const title = isToday(day)
        ? labels.today
        : isYesterday(day)
          ? labels.yesterday
          : format(day, 'PPP', { locale: dateLocale(language) });
      section = { key: String(day), title, data: [] };
      sections.set(day, section);
    }
    section.data.push(item);
  }
  return [...sections.values()];
}
