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
export const useBalanceStore = create<BalanceState>()((set, get) => ({
  wei: null,
  status: 'idle',
  refresh: async (address) => {
    if (get().status === 'loading') return;
    set({ status: 'loading' });
    try {
      set({ wei: await fetchNativeBalance(address), status: 'success' });
    } catch (error) {
      logger.warn('Balance refresh failed', { error });
      set({ status: 'error' });
    }
  },
  clear: () => set({ wei: null, status: 'idle' }),
}));
