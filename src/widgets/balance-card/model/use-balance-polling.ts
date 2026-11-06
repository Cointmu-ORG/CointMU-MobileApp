import { useEffect } from 'react';

import { useBalanceStore } from '@/entities/account';
import { BALANCE_POLL_INTERVAL_MS } from '@/shared/config';

/**
 * Fetches now, then every BALANCE_POLL_INTERVAL_MS (HTTP polling, D-09).
 * ponytail: keeps polling while backgrounded until the OS suspends JS; pause on AppState if
 * battery or RPC load ever matters.
 */
export function useBalancePolling(address: string | null): void {
  useEffect(() => {
    if (address === null) return;
    const { refresh } = useBalanceStore.getState();
    void refresh(address);
    const timer = setInterval(() => void refresh(address), BALANCE_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [address]);
}
