import {
  createTransport,
  makeOfflineTransport,
  type BaseTransportOptions,
  type Envelope,
  type Transport,
  type TransportMakeRequestResponse,
  type TransportRequest,
} from '@sentry/core';

import type { ReportQueue } from './report-queue';

export const REPORT_TIMEOUT_MS = 15_000;
const ENVELOPE_CONTENT_TYPE = 'application/x-sentry-envelope';
const HEADER_RETRY_AFTER = 'retry-after';
const HEADER_RATE_LIMITS = 'x-sentry-rate-limits';
const ENVELOPE_ITEM_EVENT = 'event';

/**
 * Keeps only error events in an envelope. Sessions, client reports, attachments (screenshots,
 * view hierarchies), replays, logs and feedback are dropped, including those sent through
 * paths that skip `beforeSend`.
 * @returns The filtered envelope, or null when nothing is left to send.
 */
export function filterEnvelopeItems(envelope: Envelope): Envelope | null {
  const [headers, items] = envelope;
  const kept = items.filter(([item]) => item.type === ENVELOPE_ITEM_EVENT);
  return kept.length === 0 ? null : ([headers, kept] as Envelope);
}

/** One POST with a timeout. A network failure rejects, which makes the offline layer queue it. */
async function postEnvelope(
  url: string,
  request: TransportRequest,
): Promise<TransportMakeRequestResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REPORT_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': ENVELOPE_CONTENT_TYPE },
      // Always a string: only event items pass filterEnvelopeItems, and they serialize to text.
      body: request.body as string,
      signal: controller.signal,
    });
    return {
      statusCode: response.status,
      headers: {
        [HEADER_RETRY_AFTER]: response.headers.get(HEADER_RETRY_AFTER),
        [HEADER_RATE_LIMITS]: response.headers.get(HEADER_RATE_LIMITS),
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

export type ReportTransportOptions = {
  readonly queue: ReportQueue;
  /** False while reports may be saved but not sent yet (the notice is still open). */
  readonly canSend: () => boolean;
};

/**
 * The SDK transport, same shape as the desktop's: envelope items are filtered first, then the
 * SDK's offline wrapper retries with backoff and keeps failed or held-back reports in the
 * bounded queue. Off the campus network the POST fails, so the report waits on the phone.
 */
export function makeReportTransport(
  options: ReportTransportOptions,
): (transportOptions: BaseTransportOptions) => Transport {
  const makeOffline = makeOfflineTransport((transportOptions: BaseTransportOptions) =>
    createTransport(transportOptions, (request) => postEnvelope(transportOptions.url, request)),
  );
  return (transportOptions) => {
    const transport = makeOffline({
      ...transportOptions,
      createStore: () => options.queue,
      flushAtStartup: true,
      shouldSend: () => options.canSend(),
    });
    return {
      send: (envelope) => {
        const filtered = filterEnvelopeItems(envelope);
        return filtered ? transport.send(filtered) : Promise.resolve({});
      },
      flush: (timeout) => transport.flush(timeout),
    };
  };
}
