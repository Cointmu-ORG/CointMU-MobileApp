import { exportPrivateKey, readWalletSecret, useWalletStore } from '@/entities/wallet';

/**
 * Reads the active account's private key. Call only after the caller verified the user
 * (architecture §5); the value goes to component state and nowhere else.
 */
export async function loadActivePrivateKey(): Promise<string> {
  const { accounts, accountIndex } = useWalletStore.getState();
  const account = accounts.find((candidate) => candidate.index === accountIndex);
  const secret = await readWalletSecret();
  if (secret === null || account === undefined) throw new Error('No wallet secret stored');
  return exportPrivateKey(secret, account);
}
