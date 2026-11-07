import { Wallet, type TransactionRequest } from 'ethers';

import type { WalletSecret } from '../api/wallet-secret';
import { deriveHdWallet } from './derive';

/** Thrown when the stored secret does not produce the account the user is sending from. */
export class SignerMismatchError extends Error {
  constructor() {
    super('The stored secret does not match the active account');
    this.name = 'SignerMismatchError';
  }
}

/**
 * Signs one transaction with the secret and drops the wallet object before returning, so no
 * signer outlives the call (architecture §5). A mnemonic goes through the derivation wrapper
 * for the account index; a private-key wallet has a single account. The caller reads the
 * secret only after authentication and passes it straight in.
 */
export async function signWithSecret(
  secret: WalletSecret,
  account: { readonly index: number; readonly address: string },
  tx: TransactionRequest,
): Promise<string> {
  let signer: Wallet | Awaited<ReturnType<typeof deriveHdWallet>> | null =
    secret.kind === 'mnemonic'
      ? await deriveHdWallet(secret.phrase, account.index)
      : new Wallet(secret.privateKey);
  try {
    if (signer.address.toLowerCase() !== account.address.toLowerCase()) {
      throw new SignerMismatchError();
    }
    return await signer.signTransaction(tx);
  } finally {
    signer = null;
  }
}
