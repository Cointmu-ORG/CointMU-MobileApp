import { mapWithLimit } from '@/shared/lib';

import { observeTx, type TxReader } from '../api/observe-tx';
import { TX_POLICY, TX_POLL_CONCURRENCY } from '../config/tx-config';
import { isTxSettled, resolveTxStatus } from '../lib/tx-status';
import { useTxStore } from './tx-store';
import type { LocalTxRecord } from './types';

/** Records still moving: pending, confirmed, or failed but not yet as deep as a final tx. */
export function selectUnsettled(records: readonly LocalTxRecord[]): LocalTxRecord[] {
  return records.filter((record) => !isTxSettled(record, TX_POLICY));
}

/**
 * One poll pass over every unsettled record (all accounts; they share the chain). Each result
 * is written back right away. Rejects if any record could not be read, so the caller backs off;
 * the records that were read are still saved.
 */
export async function pollUnsettledTxs(provider: TxReader, now: () => number = Date.now) {
  const records = selectUnsettled(useTxStore.getState().records);
  const results = await mapWithLimit(records, TX_POLL_CONCURRENCY, async (record) => {
    try {
      const observation = await observeTx(provider, record, now);
      const progress = resolveTxStatus(record, observation, TX_POLICY);
      const blockNumber = observation.receipt?.blockNumber ?? null;
      useTxStore.getState().update(record.hash, { ...progress, blockNumber });
      return null;
    } catch (error) {
      return error;
    }
  });
  const failure = results.find((result) => result !== null);
  if (failure !== undefined) throw failure;
}
