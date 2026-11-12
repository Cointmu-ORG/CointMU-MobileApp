import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Envelope } from '@sentry/core';

import { createReportQueue, REPORT_QUEUE_KEY } from './report-queue';

const SENT_AT = '2026-11-11T08:09:10.000Z';
const DAY_MS = 86_400_000;

function envelope(id: string, padding = ''): Envelope {
  return [
    { event_id: id, sent_at: SENT_AT },
    [[{ type: 'event' }, { event_id: id, message: padding }]],
  ] as Envelope;
}

const idOf = (item: Envelope | undefined) => item?.[0].event_id;

async function drain(queue: ReturnType<typeof createReportQueue>): Promise<unknown[]> {
  const ids: unknown[] = [];
  for (let item = await queue.shift(); item !== undefined; item = await queue.shift()) {
    ids.push(idOf(item));
  }
  return ids;
}

describe('createReportQueue', () => {
  it('returns reports oldest first and survives a restart', async () => {
    const queue = createReportQueue();
    await queue.push(envelope('a'));
    await queue.push(envelope('b'));
    expect(await queue.count()).toBe(2);

    const afterRestart = createReportQueue();
    expect(await drain(afterRestart)).toEqual(['a', 'b']);
    await expect(AsyncStorage.getItem(REPORT_QUEUE_KEY)).resolves.toBeNull();
  });

  it('puts a report that failed again back at the front', async () => {
    const queue = createReportQueue();
    await queue.push(envelope('b'));
    await queue.unshift(envelope('a'));
    expect(await drain(queue)).toEqual(['a', 'b']);
  });

  it('keeps only the newest reports up to the count cap', async () => {
    const queue = createReportQueue({ maxReports: 3 });
    for (const id of ['a', 'b', 'c', 'd', 'e']) await queue.push(envelope(id));
    expect(await drain(queue)).toEqual(['c', 'd', 'e']);
  });

  it('drops the oldest reports when the size cap is passed', async () => {
    // Room for two of these reports, not three.
    const size = JSON.stringify(envelope('a', 'x'.repeat(200))).length;
    const queue = createReportQueue({ maxChars: size * 2 + 1 });
    for (const id of ['a', 'b', 'c']) await queue.push(envelope(id, 'x'.repeat(200)));
    expect(await drain(queue)).toEqual(['b', 'c']);
  });

  it('drops reports older than the age cap', async () => {
    let now = 0;
    const queue = createReportQueue({ maxAgeMs: 30 * DAY_MS, now: () => now });
    await queue.push(envelope('old'));
    now = 29 * DAY_MS;
    await queue.push(envelope('recent'));
    now = 31 * DAY_MS;
    expect(await drain(queue)).toEqual(['recent']);
  });

  it('clear deletes everything that waits', async () => {
    const queue = createReportQueue();
    await queue.push(envelope('a'));
    await queue.clear();
    expect(await queue.count()).toBe(0);
    await expect(AsyncStorage.getItem(REPORT_QUEUE_KEY)).resolves.toBeNull();
  });

  it.each(['not json', '{"items":"nope"}', '[]', '{"v":1,"items":[{"createdMs":"x"}]}'])(
    'treats unreadable storage (%s) as an empty queue',
    async (stored) => {
      await AsyncStorage.setItem(REPORT_QUEUE_KEY, stored);
      const queue = createReportQueue();
      expect(await queue.shift()).toBeUndefined();
      await queue.push(envelope('a'));
      expect(await drain(queue)).toEqual(['a']);
    },
  );
});
