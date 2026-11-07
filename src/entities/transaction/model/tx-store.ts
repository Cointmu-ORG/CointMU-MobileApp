import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LocalTxRecord, TxRecordUpdate } from './types';

type TxState = {
  records: readonly LocalTxRecord[];
  /** Saves a just-broadcast tx. Ignores a hash that is already stored. */
  add: (record: LocalTxRecord) => void;
  update: (hash: string, update: TxRecordUpdate) => void;
  clear: () => void;
};

const PERSIST_VERSION = 1;

/** v0 had no writer (send did not exist yet), so there is nothing to carry over. */
export function migrateTxState(persisted: unknown, version: number): unknown {
  return version >= PERSIST_VERSION ? persisted : { records: [] };
}

// Non-sensitive: hashes, addresses, amounts and fees only. Never a key or a signed payload.
export const useTxStore = create<TxState>()(
  persist(
    (set, get) => ({
      records: [],
      add: (record) => {
        if (get().records.some((existing) => existing.hash === record.hash)) return;
        set({ records: [record, ...get().records] });
      },
      update: (hash, update) =>
        set({
          records: get().records.map((record) =>
            record.hash === hash ? { ...record, ...update } : record,
          ),
        }),
      clear: () => set({ records: [] }),
    }),
    {
      name: 'muvo.transactions',
      version: PERSIST_VERSION,
      migrate: migrateTxState,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ records }) => ({ records }),
    },
  ),
);
