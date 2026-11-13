import { create } from 'zustand';

import { logger } from '@/shared/lib';

import { fetchNativeBalance } from '../api/fetch-native-balance';

export type BalanceStatus = 'idle' | 'loading' | 'success' | 'error';

type BalanceState = {
  /** Last known balance in wei; kept on error so the UI can still show it. */
  wei: bigint | null;
  status: BalanceStatus;
  refresh: (address: string) => Promise<void>;
  clear: () => void;
};

// In memory only: a public balance, re-fetched on launch. The home page triggers refresh()
// for pull-to-refresh, and the balance-card widget polls it.
// The balance belongs to one account at a time. `clear` (an account switch) starts a new epoch,
// so an answer that was still on its way for the previous account is dropped, never shown as
// the new account's balance.
let epoch = 0;

export const useBalanceStore = create<BalanceState>()((set, get) => ({
  wei: null,
  status: 'idle',
  refresh: async (address) => {
    if (get().status === 'loading') return;
    const startedIn = epoch;
    set({ status: 'loading' });
    try {
      const wei = await fetchNativeBalance(address);
      if (startedIn === epoch) set({ wei, status: 'success' });
    } catch (error) {
      logger.warn('Balance refresh failed', { error });
      if (startedIn === epoch) set({ status: 'error' });
    }
  },
  clear: () => {
    epoch += 1;
    set({ wei: null, status: 'idle' });
  },
}));
