import type { JsonRpcProvider } from 'ethers';

import { callRpc } from '@/shared/api';

import type { NodeTxState, TxObservation } from '../lib/tx-status';

export type TxReader = Pick<
  JsonRpcProvider,
  'getTransactionCount' | 'getTransactionReceipt' | 'getTransaction' | 'getBlockNumber'
>;

function toNodeTxState(tx: { readonly blockNumber: number | null } | null): NodeTxState {
  if (tx === null) return 'unknown';
  return tx.blockNumber === null ? 'pending' : 'mined';
}

/** Reads one TxObservation for a sent tx. The provider comes from the caller (entities/network). */
export async function observeTx(
  provider: TxReader,
  tx: { readonly hash: string; readonly from: string },
  now: () => number = Date.now,
): Promise<TxObservation> {
  // Nonce first: if our tx is mined after this read, the receipt read below still sees it.
  const latestNonce = await callRpc(() => provider.getTransactionCount(tx.from, 'latest'));
  const [receipt, nodeTx] = await Promise.all([
    callRpc(() => provider.getTransactionReceipt(tx.hash)),
    callRpc(() => provider.getTransaction(tx.hash)),
  ]);
  const headBlock = await callRpc(() => provider.getBlockNumber());
  return {
    latestNonce,
    receipt: receipt && { status: receipt.status, blockNumber: receipt.blockNumber },
    nodeTx: toNodeTxState(nodeTx),
    headBlock,
    now: now(),
  };
}
