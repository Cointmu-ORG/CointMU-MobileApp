const VISIBLE_CHARS = 4;
const HEX_PREFIX_LENGTH = 2;

/** `0x1234…abcd` for display. The full address is still used for copy and lookups. */
export function shortenAddress(address: string): string {
  if (address.length <= HEX_PREFIX_LENGTH + VISIBLE_CHARS * 2) return address;
  return `${address.slice(0, HEX_PREFIX_LENGTH + VISIBLE_CHARS)}…${address.slice(-VISIBLE_CHARS)}`;
}
