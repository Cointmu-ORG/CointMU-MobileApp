import type { JsonRpcProvider } from 'ethers';

import { callRpc, createRpcProvider } from '@/shared/api';

import { network, NODE_PROBE_TIMEOUT_MS } from '../config/network';

export type NodeProbe =
  | {
      readonly status: 'reachable';
      /** Round trip of the eth_chainId call. */
      readonly latencyMs: number;
      /** Latest block the node has; null when it answered the chain check but not this. */
      readonly blockHeight: number | null;
    }
  | { readonly status: 'wrong-chain'; readonly chainId: number }
  | { readonly status: 'unreachable' };

const PROBE_OPTIONS = { timeoutMs: NODE_PROBE_TIMEOUT_MS, retries: 0 } as const;

async function readBlockHeight(provider: JsonRpcProvider): Promise<number | null> {
  try {
    const raw: unknown = await callRpc(() => provider.send('eth_blockNumber', []), PROBE_OPTIONS);
    if (typeof raw !== 'string') return null;
    const height = Number(BigInt(raw));
    return Number.isSafeInteger(height) ? height : null;
  } catch {
    return null;
  }
}

/**
 * Pings a node: eth_chainId (timed), then eth_blockNumber. Only a node that answers with the
 * CointMU chain ID may be used: any other chain would show wrong balances and could replay
 * signed transactions. A timeout, a network error or a junk answer all count as unreachable.
 */
export async function probeNode(url: string, now: () => number = Date.now): Promise<NodeProbe> {
  const provider = createRpcProvider({ url, chainId: network.chainId });
  const startedAt = now();
  try {
    const raw: unknown = await callRpc(() => provider.send('eth_chainId', []), PROBE_OPTIONS);
    const latencyMs = now() - startedAt;
    if (typeof raw !== 'string') return { status: 'unreachable' };
    const chainId = Number(BigInt(raw));
    if (chainId !== network.chainId) return { status: 'wrong-chain', chainId };
    return { status: 'reachable', latencyMs, blockHeight: await readBlockHeight(provider) };
  } catch {
    return { status: 'unreachable' };
  } finally {
    provider.destroy();
  }
}
