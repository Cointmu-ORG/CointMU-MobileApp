import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { logger } from '@/shared/lib';
import { cardColorAt, type CardColorId } from '@/shared/ui';

import { defaultAccountIcon } from '../lib/account-icon';
import { migrateWalletState, WALLET_PERSIST_VERSION } from './migrate';
import {
  activeFields,
  activeFromDefault,
  findUsableAccount,
  INITIAL,
  reconcile,
  type WalletData,
} from './wallet-data';
import {
  isWalletUsable,
  type AccountIcon,
  type NewWallet,
  type WalletAccount,
  type WalletRecord,
} from './types';

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
  /** Makes an account the default. Ignored for an unknown account or a wallet that is not usable. */
  setDefaultAccount: (walletId: string, index: number) => void;
  dismissDefaultMovedNotice: () => void;
  renameAccount: (walletId: string, index: number, name: string | null) => void;
  setAccountColor: (walletId: string, index: number, color: CardColorId) => void;
  setAccountIcon: (walletId: string, index: number, icon: AccountIcon) => void;
  updateWallet: (walletId: string, change: Partial<Pick<WalletRecord, 'name' | 'color'>>) => void;
  /** Flags exactly these wallets as unreadable; the default and the active account move off a flagged wallet. */
  setUnreadableWallets: (walletIds: readonly string[]) => void;
  /** Removes one wallet. Removing the last one returns the app to onboarding. */
  removeWallet: (walletId: string) => void;
  reset: () => void;
  requireRecovery: () => void;
  dismissRecovery: () => void;
};

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
    accounts: [
      {
        index: 0,
        address: input.address,
        name: null,
        color,
        icon: defaultAccountIcon(input.source),
      },
    ],
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

// Public data only (status, addresses, names, colors, icons). Secrets never enter this store
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
            defaultAccount: { walletId: wallet.id, index: first.index },
            hasDefaultMovedNotice: false,
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
        set({
          ...reconcile(state, wallets),
          ...(isWalletUsable(wallet) && first ? activeFields(wallet, first) : {}),
        });
      },
      completeBackup: (walletId) => {
        const state = get();
        const wallets = mapWallet(state.wallets, walletId, (wallet) => ({
          ...wallet,
          isBackupPending: false,
        }));
        set({
          ...reconcile(state, wallets),
          status: state.status === 'pendingBackup' ? 'pendingPin' : state.status,
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
                    {
                      index,
                      address,
                      name: null,
                      color: wallet.color,
                      icon: defaultAccountIcon(wallet.source),
                    },
                  ],
                },
          ),
        }),
      selectAccount: (walletId, index) => {
        const wallet = get().wallets.find((candidate) => candidate.id === walletId);
        const account = wallet?.accounts.find((candidate) => candidate.index === index);
        if (wallet && account && isWalletUsable(wallet)) set(activeFields(wallet, account));
      },
      setDefaultAccount: (walletId, index) => {
        if (findUsableAccount(get().wallets, { walletId, index }) === null) return;
        set({ defaultAccount: { walletId, index }, hasDefaultMovedNotice: false });
      },
      dismissDefaultMovedNotice: () => set({ hasDefaultMovedNotice: false }),
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
      setAccountIcon: (walletId, index, icon) =>
        set({
          wallets: mapAccount(get().wallets, { walletId, index }, (account) => ({
            ...account,
            icon,
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
        set(reconcile(state, wallets));
      },
      removeWallet: (walletId) => {
        const state = get();
        const wallets = state.wallets.filter((wallet) => wallet.id !== walletId);
        if (wallets.length === state.wallets.length) return;
        set(wallets.length === 0 ? INITIAL : reconcile(state, wallets));
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
      // The account in use is session state: it is rebuilt from the default on load.
      partialize: ({
        status,
        wallets,
        defaultAccount,
        hasDefaultMovedNotice,
        isRecoveryRequired,
      }) => ({
        status,
        wallets,
        defaultAccount,
        hasDefaultMovedNotice,
        isRecoveryRequired,
      }),
      merge: (persisted, current) => {
        const data = typeof persisted === 'object' && persisted !== null ? persisted : {};
        return { ...current, ...data, ...activeFromDefault(data) };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) logger.error('Wallet store rehydration failed', { error });
        useWalletStore.setState({ hasHydrated: true, hasHydrationFailed: Boolean(error) });
      },
    },
  ),
);
