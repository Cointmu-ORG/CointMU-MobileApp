import {
  isWalletUsable,
  type AccountRef,
  type WalletAccount,
  type WalletRecord,
  type WalletSource,
  type WalletStatus,
} from './types';

/**
 * The data of the wallet store and the pure rules that keep the default account and the account
 * in use valid when the wallet list changes. No store and no storage here.
 */
export type WalletData = {
  status: WalletStatus;
  wallets: readonly WalletRecord[];
  /**
   * The account transfers start from, set by the user (D-92). Persisted. Looking at an account
   * or picking one in a form never changes it.
   */
  defaultAccount: AccountRef | null;
  /** The default moved by itself (its wallet was removed or cannot be read); say so once. */
  hasDefaultMovedNotice: boolean;
  /**
   * The account in use right now: the one on screen or the source of the send being written.
   * Not persisted; it starts as the default account.
   */
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

export const INITIAL: WalletData = {
  status: 'none',
  wallets: [],
  defaultAccount: null,
  hasDefaultMovedNotice: false,
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

export function activeFields(wallet: WalletRecord, account: WalletAccount): ActiveFields {
  return {
    activeWalletId: wallet.id,
    accountIndex: account.index,
    address: account.address,
    source: wallet.source,
  };
}

type DefaultFields = Pick<WalletData, 'defaultAccount' | 'hasDefaultMovedNotice'>;

function findAccount(
  wallets: readonly WalletRecord[],
  ref: AccountRef | null,
): { wallet: WalletRecord; account: WalletAccount } | null {
  const wallet = wallets.find((candidate) => candidate.id === ref?.walletId);
  const account = wallet?.accounts.find((candidate) => candidate.index === ref?.index);
  return wallet && account ? { wallet, account } : null;
}

export function findUsableAccount(wallets: readonly WalletRecord[], ref: AccountRef | null) {
  const found = findAccount(wallets, ref);
  return found && isWalletUsable(found.wallet) ? found : null;
}

/** The first account of the first usable wallet. */
function firstUsable(wallets: readonly WalletRecord[]): AccountRef | null {
  const wallet = wallets.find(isWalletUsable);
  const account = wallet?.accounts[0];
  return wallet && account ? { walletId: wallet.id, index: account.index } : null;
}

/**
 * Keeps the default account while it can be used. Otherwise the first usable account becomes
 * the default, and an app past onboarding is told once. With nothing usable it is left alone.
 */
function keepOrMoveDefault(state: WalletData, wallets: readonly WalletRecord[]): DefaultFields {
  const kept = {
    defaultAccount: state.defaultAccount,
    hasDefaultMovedNotice: state.hasDefaultMovedNotice,
  };
  if (findUsableAccount(wallets, state.defaultAccount)) return kept;
  const next = firstUsable(wallets);
  if (next === null) return kept;
  const isReplacement = state.defaultAccount !== null && state.status === 'active';
  return {
    defaultAccount: next,
    hasDefaultMovedNotice: isReplacement || state.hasDefaultMovedNotice,
  };
}

/** Keeps the active account when it is still usable; otherwise it goes back to the default. */
function keepOrMoveActive(
  state: WalletData,
  wallets: readonly WalletRecord[],
  defaultAccount: AccountRef | null,
): ActiveFields {
  const found =
    findUsableAccount(wallets, {
      walletId: state.activeWalletId ?? '',
      index: state.accountIndex,
    }) ?? findUsableAccount(wallets, defaultAccount);
  return found ? activeFields(found.wallet, found.account) : NO_ACTIVE;
}

/** What follows from a changed wallet list: the default account and the account in use. */
export function reconcile(state: WalletData, wallets: readonly WalletRecord[]) {
  const defaults = keepOrMoveDefault(state, wallets);
  return { wallets, ...defaults, ...keepOrMoveActive(state, wallets, defaults.defaultAccount) };
}

/** After loading: the account in use is the default one (it is not stored itself). */
export function activeFromDefault(data: Partial<WalletData>): ActiveFields {
  const found = findAccount(data.wallets ?? [], data.defaultAccount ?? null);
  return found ? activeFields(found.wallet, found.account) : NO_ACTIVE;
}
