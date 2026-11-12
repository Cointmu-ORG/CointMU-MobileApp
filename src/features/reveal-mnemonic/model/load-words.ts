import { readWalletSecret, splitWords } from '@/entities/wallet';

/** Reads one wallet's phrase only after the caller verified the user (architecture §5). */
export async function loadRecoveryWords(walletId: string): Promise<string[]> {
  const secret = await readWalletSecret(walletId);
  if (secret?.kind !== 'mnemonic') throw new Error('No recovery phrase stored');
  return splitWords(secret.phrase);
}
