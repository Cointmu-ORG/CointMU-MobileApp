import type { BaseTransportOptions, Envelope } from '@sentry/core';

import { createReportQueue } from './report-queue';
import { filterEnvelopeItems, makeReportTransport } from './report-transport';

const SENT_AT = '2026-11-11T08:09:10.000Z';
const URL = 'http://glitchtip.test.invalid/api/1/envelope/';
const TRANSPORT_OPTIONS = { url: URL, recordDroppedEvent: jest.fn() } as BaseTransportOptions;

function eventEnvelope(id: string): Envelope {
  return [
    { event_id: id, sent_at: SENT_AT },
    [[{ type: 'event' }, { event_id: id, message: 'boom' }]],
  ] as Envelope;
}

const okResponse = { status: 200, headers: { get: () => null } };
const fetchMock = jest.fn();

function makeTransport(canSend: boolean) {
  const queue = createReportQueue();
  const transport = makeReportTransport({ queue, canSend: () => canSend })(TRANSPORT_OPTIONS);
  return { queue, transport };
}

beforeEach(() => {
  jest.useFakeTimers();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('filterEnvelopeItems', () => {
  it('keeps error events and drops sessions, attachments, replays and client reports', () => {
    const mixed = [
      { event_id: 'a' },
      [
        [{ type: 'session' }, { sid: '1' }],
        [{ type: 'event' }, { event_id: 'a' }],
        [{ type: 'attachment', filename: 'screenshot.png' }, 'png-bytes'],
        [{ type: 'replay_event' }, {}],
        [{ type: 'client_report' }, {}],
      ],
    ] as unknown as Envelope;
    expect(filterEnvelopeItems(mixed)).toEqual([
      { event_id: 'a' },
      [[{ type: 'event' }, { event_id: 'a' }]],
    ]);
  });

  it('returns null when nothing is left', () => {
    const sessionOnly = [{}, [[{ type: 'session' }, { sid: '1' }]]] as unknown as Envelope;
    expect(filterEnvelopeItems(sessionOnly)).toBeNull();
  });
});

describe('makeReportTransport', () => {
  it('posts an event to the collector when sending is allowed', async () => {
    fetchMock.mockResolvedValue(okResponse);
    const { queue, transport } = makeTransport(true);

    await transport.send(eventEnvelope('a'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe(URL);
    expect(request).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
    });
    expect(request.body).toContain('"message":"boom"');
    expect(await queue.count()).toBe(0);
  });

  it('keeps the report on the phone while the server is unreachable, then sends it', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    const { queue, transport } = makeTransport(true);

    await transport.send(eventEnvelope('offline'));
    expect(await queue.count()).toBe(1);

    // Back on the campus network: flushing retries the queue at once.
    fetchMock.mockResolvedValue(okResponse);
    await transport.flush();
    await jest.advanceTimersByTimeAsync(200);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].body).toContain('"event_id":"offline"');
    expect(await queue.count()).toBe(0);
  });

  it('saves but never sends while sending is not allowed yet', async () => {
    const { queue, transport } = makeTransport(false);
    await transport.send(eventEnvelope('held'));
    await transport.flush();
    await jest.advanceTimersByTimeAsync(200);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await queue.count()).toBe(1);
  });

  it('never sends or stores an envelope without an error event', async () => {
    const { queue, transport } = makeTransport(true);
    await transport.send([{}, [[{ type: 'session' }, { sid: '1' }]]] as unknown as Envelope);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await queue.count()).toBe(0);
  });
});
