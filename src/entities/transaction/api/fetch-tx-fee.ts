import type { JsonRpcProvider } from 'ethers';

import { callRpc } from '@/shared/api';

/** The fee actually paid (gasUsed × effective gas price), or null while not mined. */
export async function fetchTxFee(
  provider: Pick<JsonRpcProvider, 'getTransactionReceipt'>,
  hash: string,
): Promise<bigint | null> {
  const receipt = await callRpc(() => provider.getTransactionReceipt(hash));
  return receipt === null ? null : receipt.fee;
}
