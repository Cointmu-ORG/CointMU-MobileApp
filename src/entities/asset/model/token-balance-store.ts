import { create } from 'zustand';

import { logger } from '@/shared/lib';

import { fetchTokenBalances, type TokenReader } from '../api/token-api';
import { getAssetKey } from '../config/registry';
import type { Erc20Asset } from './types';

type TokenBalanceState = {
  /** Base units per asset key; a missing key means not loaded or unreadable. */
  balances: Readonly<Record<string, bigint>>;
  isLoading: boolean;
  refresh: (provider: TokenReader, owner: string, tokens: readonly Erc20Asset[]) => Promise<void>;
  clear: () => void;
};

// In memory only, like the native balance: public data, re-fetched on launch and on poll.
// As with the native balance: `clear` (an account switch) starts a new epoch, and an answer for
// the previous account is dropped.
let epoch = 0;

export const useTokenBalanceStore = create<TokenBalanceState>()((set, get) => ({
  balances: {},
  isLoading: false,
  refresh: async (provider, owner, tokens) => {
    if (get().isLoading || tokens.length === 0) return;
    const startedIn = epoch;
    set({ isLoading: true });
    try {
      const values = await fetchTokenBalances(provider, owner, tokens);
      if (startedIn !== epoch) return;
      const balances: Record<string, bigint> = {};
      tokens.forEach((token, index) => {
        const value = values[index];
        if (value !== null && value !== undefined) balances[getAssetKey(token)] = value;
      });
      set({ balances });
    } catch (error) {
      logger.warn('Token balance refresh failed', { error });
    } finally {
      if (startedIn === epoch) set({ isLoading: false });
    }
  },
  clear: () => {
    epoch += 1;
    set({ balances: {}, isLoading: false });
  },
}));
