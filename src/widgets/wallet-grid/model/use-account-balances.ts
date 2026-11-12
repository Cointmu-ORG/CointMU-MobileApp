import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAccountBalancesStore } from '@/entities/account';
import { BALANCE_POLL_INTERVAL_MS } from '@/shared/config';

/**
 * Native balances of the given accounts for the Wallets tab: fetched now, then every
 * BALANCE_POLL_INTERVAL_MS while the tab is shown and the app is in the foreground (HTTP
 * polling, D-09). Stops when either ends and refreshes at once on return.
 */
export function useAccountBalances(addresses: readonly string[], isEnabled: boolean): void {
  // The list is rebuilt on every render; its content is what matters.
  const key = addresses.join(',');

  useEffect(() => {
    if (!isEnabled || key === '') return;
    const list = key.split(',');
    const refresh = () => void useAccountBalancesStore.getState().refresh(list);
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

    if (AppState.currentState !== 'background' && AppState.currentState !== 'inactive') start();
    const subscription = AppState.addEventListener('change', (state) =>
      state === 'active' ? start() : stop(),
    );
    return () => {
      subscription.remove();
      stop();
    };
  }, [key, isEnabled]);
}
