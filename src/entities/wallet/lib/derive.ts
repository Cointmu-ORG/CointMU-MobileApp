import { HDNodeWallet } from 'ethers';

import { waitForPaint } from '@/shared/lib';

/** BIP-44 EVM path without the account index (D-12). */
export const DERIVATION_PATH_PREFIX = "m/44'/60'/0'/0";

export type DerivedAccount = {
  readonly address: string;
  readonly accountIndex: number;
};


/**
 * The single swap point for mnemonic → account derivation (Q-30).
 *
 * ethers v6 runs BIP-39 PBKDF2 (2048 rounds of HMAC-SHA512) in pure JS, which blocks the Hermes
 * JS thread for a noticeable time. We wait for a frame first so the caller's progress animation (on the
 * UI thread via Reanimated) is painted before the blocking work starts. Only the address leaves
 * this function; the HD wallet object is dropped on return.
 */
export async function deriveAccount(phrase: string, accountIndex = 0): Promise<DerivedAccount> {
  await waitForPaint();
  const wallet = HDNodeWallet.fromPhrase(
    phrase,
    undefined,
    `${DERIVATION_PATH_PREFIX}/${accountIndex}`,
  );
  return { address: wallet.address, accountIndex };
}
