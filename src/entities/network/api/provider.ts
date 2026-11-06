import type { JsonRpcProvider } from 'ethers';

import { createRpcProvider } from '@/shared/api';

import { network } from '../config/network';

let provider: JsonRpcProvider | null = null;

/** Lazily created app-wide provider for the configured CointMU endpoint. */
export function getProvider(): JsonRpcProvider {
  provider ??= createRpcProvider({ url: network.rpcUrl, chainId: network.chainId });
  return provider;
}
