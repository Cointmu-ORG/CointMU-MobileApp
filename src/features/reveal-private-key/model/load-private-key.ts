import { exportPrivateKey, readWalletSecret, type ActiveAccount } from '@/entities/wallet';

/**
 * Reads one account's private key from its own wallet's secret. Call only after the caller
 * verified the user (architecture §5); the value goes to component state and nowhere else.
 */
export async function loadPrivateKey(account: ActiveAccount): Promise<string> {
  const secret = await readWalletSecret(account.walletId);
  if (secret === null) throw new Error('No wallet secret stored');
  return exportPrivateKey(secret, account);
}
