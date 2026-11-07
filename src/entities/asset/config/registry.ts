import type { Asset, Erc20Asset, NativeAsset } from '../model/types';

// Q-01 (closed, D-49): native CMU has 18 decimals. Wei is protocol-level in geth.
const NATIVE_DECIMALS = 18;

export const NATIVE_ASSET: NativeAsset = {
  kind: 'native',
  symbol: 'CMU',
  decimals: NATIVE_DECIMALS,
};

/**
 * Tokens that ship with the app, shown on every device for the CointMU chain. Empty until the
 * owner names official CointMU tokens; users can add their own meanwhile (architecture §7).
 */
export const BUILTIN_TOKENS: readonly Erc20Asset[] = [];

/** Stable key for lists and persisted records. */
export function getAssetKey(asset: Asset): string {
  return asset.kind === 'native' ? 'native' : asset.address.toLowerCase();
}

/** Upper bound for token decimals we accept from a contract (uint8 by the ERC-20 standard). */
export const MAX_TOKEN_DECIMALS = 255;

/** Parallel balanceOf calls per refresh, to keep one node from being flooded. */
export const TOKEN_BALANCE_CONCURRENCY = 4;

/** Longest symbol and name we keep from a contract; longer values are cut. */
export const MAX_TOKEN_SYMBOL_LENGTH = 11;
export const MAX_TOKEN_NAME_LENGTH = 40;
