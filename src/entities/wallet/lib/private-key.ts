import { Wallet } from 'ethers';

const PRIVATE_KEY_PATTERN = /^(0x)?[0-9a-fA-F]{64}$/;

/**
 * Returns the 0x-prefixed key, or null when the input is not a usable secp256k1 key
 * (wrong length, zero, or out of the curve order).
 */
export function normalizePrivateKey(input: string): string | null {
  const trimmed = input.trim();
  if (!PRIVATE_KEY_PATTERN.test(trimmed)) return null;
  const key = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
  try {
    // Throws for keys outside the curve order; the wallet object is discarded immediately.
    void new Wallet(key).address;
    return key.toLowerCase();
  } catch {
    return null;
  }
}

/** Address for an already-normalized private key. */
export function addressFromPrivateKey(privateKey: string): string {
  return new Wallet(privateKey).address;
}
