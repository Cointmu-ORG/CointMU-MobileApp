import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { logger } from '@/shared/lib';

/**
 * Onboarding lifecycle (architecture §5):
 * create: none → pendingBackup → (quiz passed) pendingPin → (PIN set) active
 * import: none → pendingPin → active
 */
export type WalletStatus = 'none' | 'pendingBackup' | 'pendingPin' | 'active';
export type WalletSource = 'mnemonic' | 'private-key';

type WalletState = {
  status: WalletStatus;
  address: string | null;
  source: WalletSource | null;
  accountIndex: number;
  /** D-39: local data was unreadable and wiped; show the recovery screen instead of welcome. */
  isRecoveryRequired: boolean;
  hasHydrated: boolean;
  startBackup: (address: string) => void;
  completeBackup: () => void;
  startPinSetup: (address: string, source: WalletSource) => void;
  activate: () => void;
  reset: () => void;
  requireRecovery: () => void;
  dismissRecovery: () => void;
};

const INITIAL = {
  status: 'none',
  address: null,
  source: null,
  accountIndex: 0,
  isRecoveryRequired: false,
} as const;

// Public data only (status, address). Secrets never enter this store (forbidden rule 2).
export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      ...INITIAL,
      hasHydrated: false,
      startBackup: (address) =>
        set({ status: 'pendingBackup', address, source: 'mnemonic', isRecoveryRequired: false }),
      completeBackup: () => {
        if (get().status === 'pendingBackup') set({ status: 'pendingPin' });
      },
      startPinSetup: (address, source) =>
        set({ status: 'pendingPin', address, source, isRecoveryRequired: false }),
      activate: () => {
        if (get().status === 'pendingPin') set({ status: 'active' });
      },
      reset: () => set(INITIAL),
      requireRecovery: () => set({ ...INITIAL, isRecoveryRequired: true }),
      dismissRecovery: () => set({ isRecoveryRequired: false }),
    }),
    {
      name: 'muvo.wallet',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ status, address, source, accountIndex, isRecoveryRequired }) => ({
        status,
        address,
        source,
        accountIndex,
        isRecoveryRequired,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) logger.error('Wallet store rehydration failed', { error });
        useWalletStore.setState({ hasHydrated: true });
      },
    },
  ),
);
