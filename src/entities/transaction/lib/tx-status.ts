// Pure tx status state machine. Only type imports (erased), so scripts/watch-tx.js can load it with Node.
import type { TxPolicy } from '../config/tx-config';
import type { TxStatus } from '../model/types';

/**
 * One poll of the node. Needs only eth_getTransactionCount, eth_getTransactionReceipt,
 * eth_getTransactionByHash and eth_blockNumber: txpool and debug are off on CointMU nodes.
 */
export type TxObservation = {
  /** eth_getTransactionCount(from, 'latest'), read BEFORE the receipt so a tx mined in between is seen. */
  readonly latestNonce: number;
  /** status: 1 success, 0 reverted, null pre-Byzantium (treated as success). */
  readonly receipt: { readonly status: number | null; readonly blockNumber: number } | null;
  /** eth_getTransactionByHash returned the tx (mempool or chain). */
  readonly isKnownToNode: boolean;
  readonly headBlock: number;
  readonly now: number;
};

export type TxProgress = { readonly status: TxStatus; readonly confirmations: number };

export type TrackedTx = { readonly nonce: number; readonly createdAt: number };

/**
 * Derives the status from one observation. Stateless on purpose: a reorg that removes the
 * receipt simply yields `pending` again on the next poll.
 */
export function resolveTxStatus(tx: TrackedTx, obs: TxObservation, policy: TxPolicy): TxProgress {
  if (obs.receipt) {
    // Load-balanced or lagging nodes can report a head below the receipt block.
    const confirmations = Math.max(1, obs.headBlock - obs.receipt.blockNumber + 1);
    if (obs.receipt.status === 0) return { status: 'failed', confirmations };
    const status = confirmations >= policy.finalConfirmations ? 'final' : 'confirmed';
    return { status, confirmations };
  }
  if (obs.isKnownToNode) return { status: 'pending', confirmations: 0 };
  // No receipt and unknown: if the nonce is used, another tx with that nonce was mined.
  if (obs.latestNonce > tx.nonce) return { status: 'replaced', confirmations: 0 };
  const isDropped = obs.now - tx.createdAt >= policy.droppedAfterMs;
  return { status: isDropped ? 'dropped' : 'pending', confirmations: 0 };
}

/** True when polling can stop. A reverted tx is still watched until it is as deep as a final one. */
export function isTxSettled({ status, confirmations }: TxProgress, policy: TxPolicy): boolean {
  if (status === 'failed') return confirmations >= policy.finalConfirmations;
  return status === 'final' || status === 'replaced' || status === 'dropped';
}
