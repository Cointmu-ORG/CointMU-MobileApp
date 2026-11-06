import { callRpc, createRpcProvider } from '@/shared/api';

import { network, NODE_PROBE_TIMEOUT_MS } from '../config/network';

export type NodeProbe =
  | { readonly status: 'reachable'; readonly latencyMs: number }
  | { readonly status: 'wrong-chain'; readonly chainId: number }
  | { readonly status: 'unreachable' };

/**
 * Asks a node for eth_chainId once. Only a node that answers with the CointMU chain ID may be
 * used: any other chain would show wrong balances and could replay signed transactions.
 */
export async function probeNode(url: string, now: () => number = Date.now): Promise<NodeProbe> {
  const provider = createRpcProvider({ url, chainId: network.chainId });
  const startedAt = now();
  try {
    const raw: unknown = await callRpc(() => provider.send('eth_chainId', []), {
      timeoutMs: NODE_PROBE_TIMEOUT_MS,
      retries: 0,
    });
    const latencyMs = now() - startedAt;
    if (typeof raw !== 'string') return { status: 'unreachable' };
    const chainId = Number(BigInt(raw));
    return chainId === network.chainId
      ? { status: 'reachable', latencyMs }
      : { status: 'wrong-chain', chainId };
  } catch {
    return { status: 'unreachable' };
  } finally {
    provider.destroy();
  }
}
