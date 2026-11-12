import { useBalanceStore } from '@/entities/account';
import { useTokenBalanceStore } from '@/entities/asset';
import {
  deriveAccount,
  findWallet,
  readWalletSecret,
  useWalletStore,
  type WalletRecord,
} from '@/entities/wallet';
import type { CardColorId } from '@/shared/ui';

export const MAX_NAME_LENGTH = 24;

export type AddAccountResult =
  | { readonly ok: true; readonly index: number }
  | { readonly ok: false; readonly error: 'noMnemonic' };

/** One account of one wallet. */
export type AccountRef = { readonly walletId: string; readonly index: number };

/**
 * Makes an account of any wallet the active one. Balances are cleared so the previous
 * account's never show. A wallet that is not usable (backup pending, unreadable) is ignored.
 */
export function switchToAccount({ walletId, index }: AccountRef): void {
  const before = useWalletStore.getState();
  if (before.activeWalletId === walletId && before.accountIndex === index) return;
  before.selectAccount(walletId, index);
  if (useWalletStore.getState().address === before.address) return;
  useBalanceStore.getState().clear();
  useTokenBalanceStore.getState().clear();
}

/**
 * Derives the next BIP-44 account from one wallet's stored recovery phrase and switches to it
 * (D-44). Private-key wallets have no phrase and cannot add accounts. The phrase is read here,
 * used for the derivation and dropped; only the address is kept.
 */
export async function addNextAccount(walletId: string): Promise<AddAccountResult> {
  const secret = await readWalletSecret(walletId);
  const wallet = findWallet(walletId);
  if (secret?.kind !== 'mnemonic' || wallet === null) return { ok: false, error: 'noMnemonic' };
  const index = Math.max(-1, ...wallet.accounts.map((account) => account.index)) + 1;
  const { address } = await deriveAccount(secret.phrase, index);
  useWalletStore.getState().addAccount(walletId, { index, address });
  switchToAccount({ walletId, index });
  return { ok: true, index };
}

/** Trims and caps a name; an empty one goes back to the default ("Account N", "Wallet N"). */
function cleanName(input: string): string | null {
  const name = input.trim().slice(0, MAX_NAME_LENGTH);
  return name === '' ? null : name;
}

export function renameAccount({ walletId, index }: AccountRef, input: string): void {
  useWalletStore.getState().renameAccount(walletId, index, cleanName(input));
}

export function setAccountColor({ walletId, index }: AccountRef, color: CardColorId): void {
  useWalletStore.getState().setAccountColor(walletId, index, color);
}

/**
 * Saves a wallet's name and color. The color also goes to the wallet's accounts that still
 * have the wallet's previous color, so a card the user colored by hand keeps its own.
 */
export function saveWalletDetails(
  wallet: WalletRecord,
  details: { readonly name: string; readonly color: CardColorId },
): void {
  const store = useWalletStore.getState();
  store.updateWallet(wallet.id, { name: cleanName(details.name), color: details.color });
  for (const account of wallet.accounts) {
    if (account.color === wallet.color)
      store.setAccountColor(wallet.id, account.index, details.color);
  }
}
