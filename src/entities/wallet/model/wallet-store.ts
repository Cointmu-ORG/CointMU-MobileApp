import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { logger } from '@/shared/lib';
import { cardColorAt, type CardColorId } from '@/shared/ui';

import { migrateWalletState, WALLET_PERSIST_VERSION } from './migrate';
import {
  isWalletUsable,
  type NewWallet,
  type WalletAccount,
  type WalletRecord,
  type WalletSource,
  type WalletStatus,
} from './types';

type WalletData = {
  status: WalletStatus;
  wallets: readonly WalletRecord[];
  activeWalletId: string | null;
  /** Index of the active account in the active wallet. */
  accountIndex: number;
  /** Address of the active account; kept next to `wallets` for the many readers. */
  address: string | null;
  /** Source of the active wallet. */
  source: WalletSource | null;
  /** D-39: all local data was unreadable and wiped; show the recovery screen, not welcome. */
  isRecoveryRequired: boolean;
};

type WalletState = WalletData & {
  hasHydrated: boolean;
  /** The persisted store could not be read; startup checks must not act on the empty state. */
  hasHydrationFailed: boolean;
  /** Adds a wallet. The first one starts onboarding; a later imported one becomes active. */
  addWallet: (wallet: NewWallet) => void;
  completeBackup: (walletId: string) => void;
  activate: () => void;
  addAccount: (walletId: string, account: Pick<WalletAccount, 'index' | 'address'>) => void;
  /** Makes an account active. Ignored for an unknown account or a wallet that is not usable. */
  selectAccount: (walletId: string, index: number) => void;
  renameAccount: (walletId: string, index: number, name: string | null) => void;
  setAccountColor: (walletId: string, index: number, color: CardColorId) => void;
  updateWallet: (walletId: string, change: Partial<Pick<WalletRecord, 'name' | 'color'>>) => void;
  /** Flags exactly these wallets as unreadable; the active account moves off a flagged wallet. */
  setUnreadableWallets: (walletIds: readonly string[]) => void;
  /** Removes one wallet. Removing the last one returns the app to onboarding. */
  removeWallet: (walletId: string) => void;
  reset: () => void;
  requireRecovery: () => void;
  dismissRecovery: () => void;
};

const INITIAL: WalletData = {
  status: 'none',
  wallets: [],
  activeWalletId: null,
  accountIndex: 0,
  address: null,
  source: null,
  isRecoveryRequired: false,
};

type ActiveFields = Pick<WalletData, 'activeWalletId' | 'accountIndex' | 'address' | 'source'>;

const NO_ACTIVE: ActiveFields = {
  activeWalletId: null,
  accountIndex: 0,
  address: null,
  source: null,
};

function activeFields(wallet: WalletRecord, account: WalletAccount): ActiveFields {
  return {
    activeWalletId: wallet.id,
    accountIndex: account.index,
    address: account.address,
    source: wallet.source,
  };
}

/** The first account of the first usable wallet, or nothing active. */
function firstUsable(wallets: readonly WalletRecord[]): ActiveFields {
  const wallet = wallets.find(isWalletUsable);
  const account = wallet?.accounts[0];
  return wallet && account ? activeFields(wallet, account) : NO_ACTIVE;
}

/** Keeps the active account when it is still usable; otherwise moves to the first usable one. */
function keepOrMoveActive(state: WalletData, wallets: readonly WalletRecord[]): ActiveFields {
  const wallet = wallets.find((candidate) => candidate.id === state.activeWalletId);
  const account = wallet?.accounts.find((candidate) => candidate.index === state.accountIndex);
  return wallet && account && isWalletUsable(wallet)
    ? activeFields(wallet, account)
    : firstUsable(wallets);
}

function buildWallet(input: NewWallet, existing: readonly WalletRecord[]): WalletRecord {
  const number = Math.max(0, ...existing.map((wallet) => wallet.number)) + 1;
  const color = cardColorAt(number - 1);
  return {
    id: input.id,
    number,
    name: null,
    color,
    source: input.source,
    origin: input.origin,
    addedAt: input.addedAt,
    isBackupPending: input.origin === 'created',
    needsRecovery: false,
    accounts: [{ index: 0, address: input.address, name: null, color }],
  };
}

function mapWallet(
  wallets: readonly WalletRecord[],
  walletId: string,
  change: (wallet: WalletRecord) => WalletRecord,
): WalletRecord[] {
  return wallets.map((wallet) => (wallet.id === walletId ? change(wallet) : wallet));
}

function mapAccount(
  wallets: readonly WalletRecord[],
  target: { walletId: string; index: number },
  change: (account: WalletAccount) => WalletAccount,
): WalletRecord[] {
  return mapWallet(wallets, target.walletId, (wallet) => ({
    ...wallet,
    accounts: wallet.accounts.map((account) =>
      account.index === target.index ? change(account) : account,
    ),
  }));
}

// Public data only (status, addresses, names, colors). Secrets never enter this store
// (forbidden rule 2).
export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      ...INITIAL,
      hasHydrated: false,
      hasHydrationFailed: false,
      addWallet: (input) => {
        const state = get();
        if (state.status !== 'active') {
          // The first wallet: onboarding follows it.
          const wallet = buildWallet(input, []);
          const first = wallet.accounts[0];
          if (first === undefined) return;
          set({
            ...activeFields(wallet, first),
            wallets: [wallet],
            status: wallet.isBackupPending ? 'pendingBackup' : 'pendingPin',
            isRecoveryRequired: false,
          });
          return;
        }
        if (state.wallets.some((wallet) => wallet.id === input.id)) return;
        const wallet = buildWallet(input, state.wallets);
        const first = wallet.accounts[0];
        const wallets = [...state.wallets, wallet];
        // An imported wallet is ready at once; a created one waits for its backup quiz.
        set(
          isWalletUsable(wallet) && first
            ? { wallets, ...activeFields(wallet, first) }
            : { wallets },
        );
      },
      completeBackup: (walletId) => {
        const state = get();
        const wallets = mapWallet(state.wallets, walletId, (wallet) => ({
          ...wallet,
          isBackupPending: false,
        }));
        set({
          wallets,
          status: state.status === 'pendingBackup' ? 'pendingPin' : state.status,
          ...keepOrMoveActive(state, wallets),
        });
      },
      activate: () => {
        if (get().status === 'pendingPin') set({ status: 'active' });
      },
      addAccount: (walletId, { index, address }) =>
        set({
          wallets: mapWallet(get().wallets, walletId, (wallet) =>
            wallet.accounts.some((account) => account.index === index)
              ? wallet
              : {
                  ...wallet,
                  accounts: [
                    ...wallet.accounts,
                    { index, address, name: null, color: wallet.color },
                  ],
                },
          ),
        }),
      selectAccount: (walletId, index) => {
        const wallet = get().wallets.find((candidate) => candidate.id === walletId);
        const account = wallet?.accounts.find((candidate) => candidate.index === index);
        if (wallet && account && isWalletUsable(wallet)) set(activeFields(wallet, account));
      },
      renameAccount: (walletId, index, name) =>
        set({
          wallets: mapAccount(get().wallets, { walletId, index }, (account) => ({
            ...account,
            name,
          })),
        }),
      setAccountColor: (walletId, index, color) =>
        set({
          wallets: mapAccount(get().wallets, { walletId, index }, (account) => ({
            ...account,
            color,
          })),
        }),
      updateWallet: (walletId, change) =>
        set({
          wallets: mapWallet(get().wallets, walletId, (wallet) => ({ ...wallet, ...change })),
        }),
      setUnreadableWallets: (walletIds) => {
        const state = get();
        const wallets = state.wallets.map((wallet) => {
          const needsRecovery = walletIds.includes(wallet.id);
          return wallet.needsRecovery === needsRecovery ? wallet : { ...wallet, needsRecovery };
        });
        set({ wallets, ...keepOrMoveActive(state, wallets) });
      },
      removeWallet: (walletId) => {
        const state = get();
        const wallets = state.wallets.filter((wallet) => wallet.id !== walletId);
        if (wallets.length === state.wallets.length) return;
        set(wallets.length === 0 ? INITIAL : { wallets, ...keepOrMoveActive(state, wallets) });
      },
      reset: () => set(INITIAL),
      requireRecovery: () => set({ ...INITIAL, isRecoveryRequired: true }),
      dismissRecovery: () => set({ isRecoveryRequired: false }),
    }),
    {
      name: 'muvo.wallet',
      version: WALLET_PERSIST_VERSION,
      migrate: migrateWalletState,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({
        status,
        wallets,
        activeWalletId,
        accountIndex,
        address,
        source,
        isRecoveryRequired,
      }) => ({
        status,
        wallets,
        activeWalletId,
        accountIndex,
        address,
        source,
        isRecoveryRequired,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) logger.error('Wallet store rehydration failed', { error });
        useWalletStore.setState({ hasHydrated: true, hasHydrationFailed: Boolean(error) });
      },
    },
  ),
);
