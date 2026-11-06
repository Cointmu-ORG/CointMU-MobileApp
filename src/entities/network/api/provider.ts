import type { JsonRpcProvider } from 'ethers';

import { createRpcProvider } from '@/shared/api';

import { network } from '../config/network';
import { resolveActiveUrl, useNetworkStore } from '../model/network-store';

let cached: { url: string; provider: JsonRpcProvider } | null = null;

/** App-wide provider for the selected CointMU node; rebuilt when the selection changes. */
export function getProvider(): JsonRpcProvider {
  const url = resolveActiveUrl(useNetworkStore.getState());
  if (cached?.url !== url) {
    cached?.provider.destroy();
    cached = { url, provider: createRpcProvider({ url, chainId: network.chainId }) };
  }
  return cached.provider;
}
