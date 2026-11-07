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

/** One address of the wallet. `index` is the BIP-44 account index (D-44). */
export type WalletAccount = {
  readonly index: number;
  readonly address: string;
  /** Null shows the default name ("Account 1"). */
  readonly name: string | null;
};

type WalletState = {
  status: WalletStatus;
  /** Address of the active account; kept next to `accounts` for the many readers. */
  address: string | null;
  source: WalletSource | null;
  /** Index of the active account. */
  accountIndex: number;
  accounts: readonly WalletAccount[];
  /** D-39: local data was unreadable and wiped; show the recovery screen instead of welcome. */
  isRecoveryRequired: boolean;
  hasHydrated: boolean;
  startBackup: (address: string) => void;
  completeBackup: () => void;
  startPinSetup: (address: string, source: WalletSource) => void;
  activate: () => void;
  addAccount: (account: Omit<WalletAccount, 'name'>) => void;
  switchAccount: (index: number) => void;
  renameAccount: (index: number, name: string | null) => void;
  reset: () => void;
  requireRecovery: () => void;
  dismissRecovery: () => void;
};

const INITIAL = {
  status: 'none',
  address: null,
  source: null,
  accountIndex: 0,
  accounts: [],
  isRecoveryRequired: false,
} as const;

const PERSIST_VERSION = 1;

/** The first account of a newly created or imported wallet. */
function firstAccount(address: string) {
  return { address, accountIndex: 0, accounts: [{ index: 0, address, name: null }] };
}

/** v0 stored one address and its index; v1 keeps a list of accounts. */
export function migrateWalletState(persisted: unknown, version: number): unknown {
  if (version >= PERSIST_VERSION || typeof persisted !== 'object' || persisted === null) {
    return persisted;
  }
  const v0 = persisted as { address?: unknown; accountIndex?: unknown };
  const index = typeof v0.accountIndex === 'number' ? v0.accountIndex : 0;
  const accounts =
    typeof v0.address === 'string' ? [{ index, address: v0.address, name: null }] : [];
  return { ...persisted, accounts };
}

// Public data only (status, addresses, names). Secrets never enter this store (forbidden rule 2).
export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      ...INITIAL,
      hasHydrated: false,
      startBackup: (address) =>
        set({
          ...firstAccount(address),
          status: 'pendingBackup',
          source: 'mnemonic',
          isRecoveryRequired: false,
        }),
      completeBackup: () => {
        if (get().status === 'pendingBackup') set({ status: 'pendingPin' });
      },
      startPinSetup: (address, source) =>
        set({ ...firstAccount(address), status: 'pendingPin', source, isRecoveryRequired: false }),
      activate: () => {
        if (get().status === 'pendingPin') set({ status: 'active' });
      },
      addAccount: ({ index, address }) => {
        if (get().accounts.some((account) => account.index === index)) return;
        set({ accounts: [...get().accounts, { index, address, name: null }] });
      },
      switchAccount: (index) => {
        const account = get().accounts.find((candidate) => candidate.index === index);
        if (account) set({ accountIndex: index, address: account.address });
      },
      renameAccount: (index, name) =>
        set({
          accounts: get().accounts.map((account) =>
            account.index === index ? { ...account, name } : account,
          ),
        }),
      reset: () => set(INITIAL),
      requireRecovery: () => set({ ...INITIAL, isRecoveryRequired: true }),
      dismissRecovery: () => set({ isRecoveryRequired: false }),
    }),
    {
      name: 'muvo.wallet',
      version: PERSIST_VERSION,
      migrate: migrateWalletState,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ status, address, source, accountIndex, accounts, isRecoveryRequired }) => ({
        status,
        address,
        source,
        accountIndex,
        accounts,
        isRecoveryRequired,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) logger.error('Wallet store rehydration failed', { error });
        useWalletStore.setState({ hasHydrated: true });
      },
    },
  ),
);
