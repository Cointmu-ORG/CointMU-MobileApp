import { create } from 'zustand';

import { logger, mapWithLimit } from '@/shared/lib';

import { fetchNativeBalance } from '../api/fetch-native-balance';
import type { BalanceStatus } from './balance-store';

/** Balance requests in flight at once, so a long account list does not flood the node. */
const BALANCE_CONCURRENCY = 4;

export type AccountBalance = {
  /** Last known balance in wei; kept on error so the card can still show it. */
  readonly wei: bigint | null;
  readonly status: BalanceStatus;
};

type AccountBalancesState = {
  /** Keyed by lowercase address. */
  balances: Readonly<Record<string, AccountBalance>>;
  isRefreshing: boolean;
  /** Fetches the native balance of each address. A run already in flight is not doubled. */
  refresh: (addresses: readonly string[]) => Promise<void>;
  clear: () => void;
};

const UNKNOWN: AccountBalance = { wei: null, status: 'idle' };

/** The balance of one address, or "not loaded yet". */
export function balanceOf(
  balances: Readonly<Record<string, AccountBalance>>,
  address: string,
): AccountBalance {
  return balances[address.toLowerCase()] ?? UNKNOWN;
}

// In memory only: public balances of the user's own accounts for the Wallets tab, re-fetched
// when it opens. The home card keeps its own single-balance store.
export const useAccountBalancesStore = create<AccountBalancesState>()((set, get) => ({
  balances: {},
  isRefreshing: false,
  refresh: async (addresses) => {
    if (get().isRefreshing) return;
    set({ isRefreshing: true });
    const write = (address: string, balance: AccountBalance) =>
      set({ balances: { ...get().balances, [address.toLowerCase()]: balance } });
    try {
      await mapWithLimit(addresses, BALANCE_CONCURRENCY, async (address) => {
        const previous = balanceOf(get().balances, address);
        write(address, { wei: previous.wei, status: 'loading' });
        try {
          write(address, { wei: await fetchNativeBalance(address), status: 'success' });
        } catch (error) {
          logger.warn('Account balance refresh failed', { error });
          write(address, { wei: previous.wei, status: 'error' });
        }
      });
    } finally {
      set({ isRefreshing: false });
    }
  },
  clear: () => set({ balances: {}, isRefreshing: false }),
}));
