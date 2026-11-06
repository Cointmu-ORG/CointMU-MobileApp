import {
  addressFromPrivateKey,
  deriveAccount,
  isValidMnemonic,
  normalizePhrase,
  normalizePrivateKey,
  saveWalletSecret,
  useWalletStore,
} from '@/entities/wallet';

export type ImportError = 'invalidMnemonic' | 'invalidPrivateKey';
export type ImportResult =
  { readonly ok: true } | { readonly ok: false; readonly error: ImportError };

/** Validates, derives account 0, stores the phrase in SecureStore, then moves on to PIN setup. */
export async function importFromMnemonic(input: string): Promise<ImportResult> {
  const phrase = normalizePhrase(input);
  if (!isValidMnemonic(phrase)) return { ok: false, error: 'invalidMnemonic' };
  const { address } = await deriveAccount(phrase);
  await saveWalletSecret({ kind: 'mnemonic', phrase });
  useWalletStore.getState().startPinSetup(address, 'mnemonic');
  return { ok: true };
}

/** A private-key wallet has no mnemonic and cannot derive more accounts (architecture §5). */
export async function importFromPrivateKey(input: string): Promise<ImportResult> {
  const privateKey = normalizePrivateKey(input);
  if (privateKey === null) return { ok: false, error: 'invalidPrivateKey' };
  const address = addressFromPrivateKey(privateKey);
  await saveWalletSecret({ kind: 'private-key', privateKey });
  useWalletStore.getState().startPinSetup(address, 'private-key');
  return { ok: true };
}
