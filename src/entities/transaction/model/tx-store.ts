import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LocalTxRecord } from './types';

type TxState = {
  records: readonly LocalTxRecord[];
  clear: () => void;
};

// Non-sensitive: hashes and amounts only. Writing records arrives with the send feature.
export const useTxStore = create<TxState>()(
  persist(
    (set) => ({
      records: [],
      clear: () => set({ records: [] }),
    }),
    {
      name: 'muvo.transactions',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ records }) => ({ records }),
    },
  ),
);
