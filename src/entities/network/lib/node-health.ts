import type { NodeProbe } from '../api/probe-node';

/** What a ping says about a node, once it is compared with the other nodes. */
export type NodeHealth =
  | { readonly status: 'healthy' }
  /** On the right chain but behind the best node by more than the threshold. */
  | { readonly status: 'out-of-sync'; readonly blocksBehind: number }
  | { readonly status: 'wrong-chain'; readonly chainId: number }
  | { readonly status: 'unreachable' };

/** Highest block among the nodes that passed the chain check; null when none reported one. */
export function bestBlockHeight(probes: readonly (NodeProbe | undefined)[]): number | null {
  const heights = probes.flatMap((probe) =>
    probe?.status === 'reachable' && probe.blockHeight !== null ? [probe.blockHeight] : [],
  );
  return heights.length === 0 ? null : Math.max(...heights);
}

/**
 * Health of one node. A node on another chain never counts toward the best height, so it can
 * never make CointMU nodes look out of sync. A node that did not report a height is not flagged:
 * there is nothing to compare.
 */
export function assessNode(
  probe: NodeProbe,
  bestHeight: number | null,
  lagThreshold: number,
): NodeHealth {
  if (probe.status !== 'reachable') return probe;
  if (bestHeight === null || probe.blockHeight === null) return { status: 'healthy' };
  const blocksBehind = bestHeight - probe.blockHeight;
  return blocksBehind > lagThreshold
    ? { status: 'out-of-sync', blocksBehind }
    : { status: 'healthy' };
}
