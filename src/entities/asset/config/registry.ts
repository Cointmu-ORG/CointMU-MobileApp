import type { Asset } from '../model/types';

// Q-01: 18 decimals assumed, still to be verified against the chain.
const NATIVE_DECIMALS = 18;

export const NATIVE_ASSET: Asset = { kind: 'native', symbol: 'CMU', decimals: NATIVE_DECIMALS };

/** Assets the wallet shows. ERC-20 entries are added here later (architecture §7). */
export const ASSET_REGISTRY: readonly Asset[] = [NATIVE_ASSET];

/** Stable key for lists and persisted records. */
export function getAssetKey(asset: Asset): string {
  return asset.kind === 'native' ? 'native' : asset.address.toLowerCase();
}
