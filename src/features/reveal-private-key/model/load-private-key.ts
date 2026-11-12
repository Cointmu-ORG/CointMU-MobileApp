import { exportPrivateKey, getActiveAccount, readWalletSecret } from '@/entities/wallet';

/**
 * Reads the active account's private key from its own wallet's secret. Call only after the
 * caller verified the user (architecture §5); the value goes to component state and nowhere else.
 */
export async function loadActivePrivateKey(): Promise<string> {
  const account = getActiveAccount();
  if (account === null) throw new Error('No active account');
  const secret = await readWalletSecret(account.walletId);
  if (secret === null) throw new Error('No wallet secret stored');
  return exportPrivateKey(secret, account);
}
