import type { CardColorId } from '@/shared/ui';

/**
 * Onboarding lifecycle of the app (architecture §5), driven by the first wallet:
 * create: none → pendingBackup → (quiz passed) pendingPin → (PIN set) active
 * import: none → pendingPin → active
 * Wallets added later never change it; a created one carries its own `isBackupPending`.
 */
export type WalletStatus = 'none' | 'pendingBackup' | 'pendingPin' | 'active';
export type WalletSource = 'mnemonic' | 'private-key';
export type WalletOrigin = 'created' | 'imported';

/** One address of a wallet. `index` is the BIP-44 account index (D-44). */
export type WalletAccount = {
  readonly index: number;
  readonly address: string;
  /** Null shows the default name ("Account 1"). */
  readonly name: string | null;
  readonly color: CardColorId;
};

/**
 * One secret (recovery phrase or private key) and its accounts (D-78). Public data only: the
 * secret itself lives in SecureStore under the wallet's id.
 */
export type WalletRecord = {
  readonly id: string;
  /** Stable 1-based number for the default name ("Wallet 2"); never reused while it exists. */
  readonly number: number;
  readonly name: string | null;
  /** Default color for the wallet's new accounts. */
  readonly color: CardColorId;
  readonly source: WalletSource;
  /** Null for the wallet migrated from a single-wallet install, where it was not recorded. */
  readonly origin: WalletOrigin | null;
  readonly addedAt: number | null;
  /** A created wallet whose recovery phrase was not verified yet (D-32); it cannot be used. */
  readonly isBackupPending: boolean;
  /** The startup check could not read this wallet's secret (D-39); it cannot be used. */
  readonly needsRecovery: boolean;
  readonly accounts: readonly WalletAccount[];
};

/** The active account together with the wallet that holds its secret. */
export type ActiveAccount = WalletAccount & { readonly walletId: string };

/** What a new wallet starts from; the store fills in the rest. */
export type NewWallet = {
  readonly id: string;
  readonly source: WalletSource;
  readonly origin: WalletOrigin;
  /** Address of account 0. */
  readonly address: string;
  readonly addedAt: number;
};

/** A wallet that can be made active, sign and add accounts. */
export function isWalletUsable(wallet: WalletRecord): boolean {
  return !wallet.isBackupPending && !wallet.needsRecovery;
}
