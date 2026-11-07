import { useBalanceStore } from '@/entities/account';
import { deriveAccount, readWalletSecret, useWalletStore } from '@/entities/wallet';

export const MAX_ACCOUNT_NAME_LENGTH = 24;

export type AddAccountResult =
  | { readonly ok: true; readonly index: number }
  | { readonly ok: false; readonly error: 'noMnemonic' };

/** Makes `index` the active account. The balance is cleared so the old one never shows. */
export function switchToAccount(index: number): void {
  const wallet = useWalletStore.getState();
  if (wallet.accountIndex === index) return;
  wallet.switchAccount(index);
  useBalanceStore.getState().clear();
}

/**
 * Derives the next BIP-44 account from the stored recovery phrase and switches to it (D-44).
 * Private-key wallets have no phrase and cannot add accounts. The phrase is read here, used for
 * the derivation and dropped; only the address is kept.
 */
export async function addNextAccount(): Promise<AddAccountResult> {
  const secret = await readWalletSecret();
  if (secret?.kind !== 'mnemonic') return { ok: false, error: 'noMnemonic' };
  const { accounts } = useWalletStore.getState();
  const index = Math.max(-1, ...accounts.map((account) => account.index)) + 1;
  const { address } = await deriveAccount(secret.phrase, index);
  useWalletStore.getState().addAccount({ index, address });
  switchToAccount(index);
  return { ok: true, index };
}

/** Trims and caps the name; an empty name goes back to the default ("Account N"). */
export function renameAccount(index: number, input: string): void {
  const name = input.trim().slice(0, MAX_ACCOUNT_NAME_LENGTH);
  useWalletStore.getState().renameAccount(index, name === '' ? null : name);
}
