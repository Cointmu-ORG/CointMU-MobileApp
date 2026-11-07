import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getProvider } from '@/entities/network';
import { nextPollDelayMs, pollUnsettledTxs } from '@/entities/transaction';
import { logger } from '@/shared/lib';

/**
 * Polls every unsettled local tx while the app is in the foreground (HTTP polling, D-09):
 * now, then every TX_POLL_INTERVAL_MS, backing off after failures. Leaving `active` pauses it;
 * returning resumes at once. Starting the app resumes every unfinished record, since the
 * records are persisted. Status logic is the pure state machine (D-48).
 */
export function useTxPolling(isEnabled: boolean): void {
  useEffect(() => {
    if (!isEnabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;
    let isStopped = false;
    let isRunning = false;

    const schedule = () => {
      if (!isStopped) timer = setTimeout(() => void tick(), nextPollDelayMs(failures));
    };
    const tick = async () => {
      timer = null;
      isRunning = true;
      try {
        await pollUnsettledTxs(getProvider());
        failures = 0;
      } catch (error) {
        failures += 1;
        logger.warn('Transaction status poll failed', { error, failures });
      } finally {
        isRunning = false;
      }
      schedule();
    };
    const start = () => {
      isStopped = false;
      // A tick still waiting on the node schedules the next one itself.
      if (timer === null && !isRunning) void tick();
    };
    const stop = () => {
      isStopped = true;
      if (timer !== null) clearTimeout(timer);
      timer = null;
    };

    if (AppState.currentState !== 'background') start();
    const subscription = AppState.addEventListener('change', (state) =>
      state === 'active' ? start() : stop(),
    );
    return () => {
      subscription.remove();
      stop();
    };
  }, [isEnabled]);
}
