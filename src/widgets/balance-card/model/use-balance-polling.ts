import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useBalanceStore } from '@/entities/account';
import { getVisibleTokens, useTokenBalanceStore } from '@/entities/asset';
import { getProvider } from '@/entities/network';
import { BALANCE_POLL_INTERVAL_MS } from '@/shared/config';

// iOS can report `unknown` at launch; only an explicit background state skips the first fetch.
const isBackgroundAtStart = (state: string | null | undefined) =>
  state === 'background' || state === 'inactive';

/**
 * Native and visible token balances. Fetches now, then every BALANCE_POLL_INTERVAL_MS while the
 * app is `active` (HTTP polling, D-09).
 * Polling stops when the app leaves `active` and restarts with an immediate refresh on return.
 */
export function useBalancePolling(address: string | null): void {
  useEffect(() => {
    if (address === null) return;
    const refresh = () => {
      void useBalanceStore.getState().refresh(address);
      void useTokenBalanceStore.getState().refresh(getProvider(), address, getVisibleTokens());
    };
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer !== null) return;
      refresh();
      timer = setInterval(refresh, BALANCE_POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    };

    if (!isBackgroundAtStart(AppState.currentState)) start();
    const subscription = AppState.addEventListener('change', (state) =>
      state === 'active' ? start() : stop(),
    );
    return () => {
      subscription.remove();
      stop();
    };
  }, [address]);
}
