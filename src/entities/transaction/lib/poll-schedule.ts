import { TX_POLL_INTERVAL_MS, TX_POLL_MAX_BACKOFF_MS } from '../config/tx-config';

/** Delay before the next poll: the base interval, doubled per consecutive failure, capped. */
export function nextPollDelayMs(consecutiveFailures: number): number {
  const backoff = TX_POLL_INTERVAL_MS * 2 ** Math.max(0, consecutiveFailures);
  return Math.min(backoff, Math.max(TX_POLL_INTERVAL_MS, TX_POLL_MAX_BACKOFF_MS));
}
