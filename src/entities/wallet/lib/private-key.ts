import { Wallet } from 'ethers';

const PRIVATE_KEY_PATTERN = /^(0x)?[0-9a-f]{64}$/;

/**
 * Returns the lowercase 0x-prefixed key, or null when the input is not a usable secp256k1 key
 * (wrong length, zero, or out of the curve order). Whitespace anywhere is dropped (keys pasted
 * from a wrapped display) and the prefix may be `0X`.
 */
export function normalizePrivateKey(input: string): string | null {
  const compact = input.replace(/\s+/g, '').toLowerCase();
  if (!PRIVATE_KEY_PATTERN.test(compact)) return null;
  const key = compact.startsWith('0x') ? compact : `0x${compact}`;
  try {
    // Throws for keys outside the curve order; the wallet object is discarded immediately.
    void new Wallet(key).address;
    return key;
  } catch {
    return null;
  }
}

/** Address for an already-normalized private key. */
export function addressFromPrivateKey(privateKey: string): string {
  return new Wallet(privateKey).address;
}
