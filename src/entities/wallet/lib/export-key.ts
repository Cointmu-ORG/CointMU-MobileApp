import { Wallet } from 'ethers';

import type { WalletSecret } from '../api/wallet-secret';
import { deriveHdWallet } from './derive';
import { SignerMismatchError } from './signer';

/**
 * The private key of one account, for the "Show private key" screen only (D-70). A recovery
 * phrase goes through the derivation wrapper for the account's index; a private-key wallet's
 * key is the stored secret itself. The key is returned only when it really produces the
 * account's address, and the wallet object is dropped before returning. The caller reads the
 * secret after authentication, keeps the key in component state and never logs or copies it.
 */
export async function exportPrivateKey(
  secret: WalletSecret,
  account: { readonly index: number; readonly address: string },
): Promise<string> {
  let wallet: Wallet | Awaited<ReturnType<typeof deriveHdWallet>> | null =
    secret.kind === 'mnemonic'
      ? await deriveHdWallet(secret.phrase, account.index)
      : new Wallet(secret.privateKey);
  try {
    if (wallet.address.toLowerCase() !== account.address.toLowerCase()) {
      throw new SignerMismatchError();
    }
    return wallet.privateKey;
  } finally {
    wallet = null;
  }
}
