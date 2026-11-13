import type { HistoryItem } from '@/entities/transaction';

import { groupByDay } from './group-by-day';

const LABELS = { today: 'Today', yesterday: 'Yesterday' };
const DAY_MS = 86_400_000;
const OLD_DAYS = 10;

function at(timestamp: number, hash: string): HistoryItem {
  return {
    hash,
    owner: '0x02',
    from: '0x01',
    to: '0x02',
    value: '1',
    assetKey: 'native',
    direction: 'in',
    status: 'final',
    confirmations: 20,
    blockNumber: 1,
    timestamp,
    source: 'chain',
  };
}

describe('groupByDay', () => {
  it('names today and yesterday and keeps the input order inside a day', () => {
    const now = Date.now();
    const sections = groupByDay(
      [at(now, 'a'), at(now - 1, 'b'), at(now - DAY_MS, 'c'), at(now - OLD_DAYS * DAY_MS, 'd')],
      'en',
      LABELS,
    );
    expect(sections.map((s) => s.title).slice(0, 2)).toEqual(['Today', 'Yesterday']);
    expect(sections[0]?.data.map((i) => i.hash)).toEqual(['a', 'b']);
    expect(sections).toHaveLength(3);
  });

  it('formats older days in the app language', () => {
    const old = Date.UTC(2026, 0, 15, 12);
    const [id] = groupByDay([at(old, 'x')], 'id', LABELS);
    const [en] = groupByDay([at(old, 'x')], 'en', LABELS);
    expect(id?.title).toMatch(/Januari 2026/);
    expect(en?.title).toMatch(/January 15(th)?, 2026/);
  });
});
