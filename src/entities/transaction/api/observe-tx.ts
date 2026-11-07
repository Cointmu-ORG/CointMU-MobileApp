import type { JsonRpcProvider } from 'ethers';

import { callRpc } from '@/shared/api';

import type { TxObservation } from '../lib/tx-status';

export type TxReader = Pick<
  JsonRpcProvider,
  'getTransactionCount' | 'getTransactionReceipt' | 'getTransaction' | 'getBlockNumber'
>;

/** Reads one TxObservation for a sent tx. The provider comes from the caller (entities/network). */
export async function observeTx(
  provider: TxReader,
  tx: { readonly hash: string; readonly from: string },
  now: () => number = Date.now,
): Promise<TxObservation> {
  // Nonce first: if our tx is mined after this read, the receipt read below still sees it.
  const latestNonce = await callRpc(() => provider.getTransactionCount(tx.from, 'latest'));
  const [receipt, known] = await Promise.all([
    callRpc(() => provider.getTransactionReceipt(tx.hash)),
    callRpc(() => provider.getTransaction(tx.hash)),
  ]);
  const headBlock = await callRpc(() => provider.getBlockNumber());
  return {
    latestNonce,
    receipt: receipt && { status: receipt.status, blockNumber: receipt.blockNumber },
    isKnownToNode: known !== null,
    headBlock,
    now: now(),
  };
}
