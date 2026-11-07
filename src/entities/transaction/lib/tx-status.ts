// Pure tx status state machine. Only type imports (erased), so scripts/watch-tx.js can load it with Node.
import type { TxPolicy } from '../config/tx-config';
import type { TxStatus } from '../model/types';

/** What eth_getTransactionByHash says: null, in the pool (blockNumber null), or in a block. */
export type NodeTxState = 'unknown' | 'pending' | 'mined';

/**
 * One poll of the node. Needs only eth_getTransactionCount, eth_getTransactionReceipt,
 * eth_getTransactionByHash and eth_blockNumber: txpool and debug are off on CointMU nodes.
 */
export type TxObservation = {
  /** eth_getTransactionCount(from, 'latest'), read BEFORE the receipt so a tx mined in between is seen. */
  readonly latestNonce: number;
  /** status: 1 success, 0 reverted, null pre-Byzantium (treated as success). */
  readonly receipt: { readonly status: number | null; readonly blockNumber: number } | null;
  readonly nodeTx: NodeTxState;
  readonly headBlock: number;
  readonly now: number;
};

/** The part of a stored record the state machine needs. */
export type TrackedTx = {
  readonly nonce: number;
  /** When the node first stopped knowing the tx (epoch ms); null while it knows it. */
  readonly unknownSince: number | null;
};

export type TxProgress = {
  readonly status: TxStatus;
  readonly confirmations: number;
  /** Store this back on the record for the next poll. */
  readonly unknownSince: number | null;
};

function fromReceipt(
  receipt: NonNullable<TxObservation['receipt']>,
  headBlock: number,
  policy: TxPolicy,
): TxProgress {
  // Load-balanced or lagging nodes can report a head below the receipt block.
  const confirmations = Math.max(1, headBlock - receipt.blockNumber + 1);
  if (receipt.status === 0) return { status: 'failed', confirmations, unknownSince: null };
  const status = confirmations >= policy.finalConfirmations ? 'final' : 'confirmed';
  return { status, confirmations, unknownSince: null };
}

/**
 * Derives the status from one observation. A reorg that removes the receipt yields `pending`
 * again. `dropped` needs all three: the node no longer returns the tx, its nonce is still unused,
 * and both have held for `droppedAfterMs` since the tx first went unknown. A tx the node still
 * returns stays pending however long it waits.
 */
export function resolveTxStatus(tx: TrackedTx, obs: TxObservation, policy: TxPolicy): TxProgress {
  if (obs.receipt) return fromReceipt(obs.receipt, obs.headBlock, policy);
  // In a block but the receipt is not indexed yet: wait for it.
  if (obs.nodeTx === 'mined') return { status: 'pending', confirmations: 0, unknownSince: null };
  // Our hash has no receipt but its nonce is used: another tx with that nonce was mined.
  if (obs.latestNonce > tx.nonce)
    return { status: 'replaced', confirmations: 0, unknownSince: null };
  if (obs.nodeTx === 'pending') return { status: 'pending', confirmations: 0, unknownSince: null };
  const unknownSince = tx.unknownSince ?? obs.now;
  const isDropped = obs.now - unknownSince >= policy.droppedAfterMs;
  return { status: isDropped ? 'dropped' : 'pending', confirmations: 0, unknownSince };
}

/** True when polling can stop. A reverted tx is still watched until it is as deep as a final one. */
export function isTxSettled(
  { status, confirmations }: Pick<TxProgress, 'status' | 'confirmations'>,
  policy: TxPolicy,
): boolean {
  if (status === 'failed') return confirmations >= policy.finalConfirmations;
  return status === 'final' || status === 'replaced' || status === 'dropped';
}
