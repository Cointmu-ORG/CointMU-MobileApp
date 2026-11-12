import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Envelope, OfflineStore } from '@sentry/core';

/** Where unsent reports wait. They are already scrubbed, and public like any other pref. */
export const REPORT_QUEUE_KEY = 'muvo.error-reports';
export const QUEUE_MAX_REPORTS = 30;
/** Characters of JSON, about bytes for our ASCII reports. Far below AsyncStorage's row limit. */
export const QUEUE_MAX_CHARS = 512 * 1024;
export const QUEUE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const QUEUE_VERSION = 1;

type QueuedReport = { readonly createdMs: number; readonly envelope: string };

export type ReportQueueOptions = {
  readonly maxReports?: number;
  readonly maxChars?: number;
  readonly maxAgeMs?: number;
  readonly now?: () => number;
};

export type ReportQueue = OfflineStore & {
  /** Deletes every report waiting to be sent. */
  clear(): Promise<void>;
  count(): Promise<number>;
};

function isQueuedReport(value: unknown): value is QueuedReport {
  if (typeof value !== 'object' || value === null) return false;
  const { createdMs, envelope } = value as Record<string, unknown>;
  return typeof createdMs === 'number' && typeof envelope === 'string';
}

function parseQueue(raw: string | null): QueuedReport[] {
  if (raw === null) return [];
  try {
    const stored: unknown = JSON.parse(raw);
    const items = (stored as { items?: unknown } | null)?.items;
    return Array.isArray(items) ? items.filter(isQueuedReport) : [];
  } catch {
    // An unreadable queue is the same as an empty one: reports are best-effort.
    return [];
  }
}

function parseEnvelope(text: string): Envelope | undefined {
  try {
    const value: unknown = JSON.parse(text);
    return Array.isArray(value) ? (value as Envelope) : undefined;
  } catch {
    // One unreadable report is skipped; the rest of the queue still goes out.
    return undefined;
  }
}

/**
 * Offline store for the SDK's offline transport, in AsyncStorage so it also works in Expo Go:
 * capped by count, size and age, oldest reports dropped first. Operations run one at a time.
 * Envelopes hold event items only (see the transport), so they are plain JSON.
 */
export function createReportQueue(options: ReportQueueOptions = {}): ReportQueue {
  const {
    maxReports = QUEUE_MAX_REPORTS,
    maxChars = QUEUE_MAX_CHARS,
    maxAgeMs = QUEUE_MAX_AGE_MS,
    now = Date.now,
  } = options;
  let tail: Promise<unknown> = Promise.resolve();

  const serial = <T>(task: () => Promise<T>): Promise<T> => {
    const run = tail.then(task, task);
    tail = run.catch(() => undefined);
    return run;
  };

  const prune = (items: readonly QueuedReport[]): QueuedReport[] => {
    const cutoff = now() - maxAgeMs;
    const kept = items.filter((item) => item.createdMs >= cutoff).slice(-maxReports);
    let total = kept.reduce((sum, item) => sum + item.envelope.length, 0);
    while (total > maxChars && kept.length > 0) total -= kept.shift()?.envelope.length ?? 0;
    return kept;
  };

  const read = async (): Promise<QueuedReport[]> =>
    prune(parseQueue(await AsyncStorage.getItem(REPORT_QUEUE_KEY)));

  const write = async (items: readonly QueuedReport[]): Promise<void> => {
    const kept = prune(items);
    if (kept.length === 0) return AsyncStorage.removeItem(REPORT_QUEUE_KEY);
    await AsyncStorage.setItem(REPORT_QUEUE_KEY, JSON.stringify({ v: QUEUE_VERSION, items: kept }));
  };

  const toItem = (envelope: Envelope): QueuedReport => ({
    createdMs: now(),
    envelope: JSON.stringify(envelope),
  });

  return {
    push: (envelope) => serial(async () => write([...(await read()), toItem(envelope)])),
    // A report that failed again goes back to the front, and is the first one to be dropped.
    unshift: (envelope) => serial(async () => write([toItem(envelope), ...(await read())])),
    shift: () =>
      serial(async () => {
        const [first, ...rest] = await read();
        if (first === undefined) return undefined;
        await write(rest);
        return parseEnvelope(first.envelope);
      }),
    clear: () => serial(() => AsyncStorage.removeItem(REPORT_QUEUE_KEY)),
    count: () => serial(async () => (await read()).length),
  };
}
