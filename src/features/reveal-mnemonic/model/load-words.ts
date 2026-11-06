import { readWalletSecret, splitWords } from '@/entities/wallet';

/** Reads the phrase only after the caller verified the user (architecture §5). */
export async function loadRecoveryWords(): Promise<string[]> {
  const secret = await readWalletSecret();
  if (secret?.kind !== 'mnemonic') throw new Error('No recovery phrase stored');
  return splitWords(secret.phrase);
}
