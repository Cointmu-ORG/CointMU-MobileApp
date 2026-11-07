import { getAddress } from 'ethers';

const VISIBLE_CHARS = 4;
const HEX_PREFIX_LENGTH = 2;
const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/** `0x1234…abcd` for display. The full address is still used for copy and lookups. */
export function shortenAddress(address: string): string {
  if (address.length <= HEX_PREFIX_LENGTH + VISIBLE_CHARS * 2) return address;
  return `${address.slice(0, HEX_PREFIX_LENGTH + VISIBLE_CHARS)}…${address.slice(-VISIBLE_CHARS)}`;
}

export type AddressCheck =
  | { readonly ok: true; readonly address: string }
  | { readonly ok: false; readonly error: 'invalid' | 'badChecksum' };

/**
 * Validates a typed or scanned EVM address. All-lowercase (or all-uppercase) input has no
 * checksum and is accepted; mixed case must match the EIP-55 checksum, so a typo in a
 * checksummed address is caught. Returns the checksummed form.
 */
export function checkAddress(input: string): AddressCheck {
  const value = input.trim();
  if (!HEX_ADDRESS.test(value)) return { ok: false, error: 'invalid' };
  try {
    return { ok: true, address: getAddress(value) };
  } catch {
    // getAddress only throws here for a mixed-case value whose checksum does not match.
    return { ok: false, error: 'badChecksum' };
  }
}

/** Case-insensitive address equality. */
export function isSameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
