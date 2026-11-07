import type { HistoryItem, LocalTxRecord, TxDirection } from '../model/types';

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Direction from the owner's point of view. */
export function directionOf(from: string, to: string, owner: string): TxDirection {
  if (same(from, owner) && same(to, owner)) return 'self';
  return same(from, owner) ? 'out' : 'in';
}

export function recordToHistoryItem(record: LocalTxRecord, owner: string): HistoryItem {
  return {
    hash: record.hash,
    from: record.from,
    to: record.to,
    value: record.value,
    assetKey: record.assetKey,
    direction: directionOf(record.from, record.to, owner),
    status: record.status,
    confirmations: record.confirmations,
    blockNumber: record.blockNumber,
    timestamp: record.createdAt,
    source: 'local',
  };
}
