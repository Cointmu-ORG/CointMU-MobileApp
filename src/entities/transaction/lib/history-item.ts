import type { HistoryItem, LocalTxRecord, TxDirection } from '../model/types';

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Direction from the owner's point of view. */
export function directionOf(from: string, to: string, owner: string): TxDirection {
  if (same(from, owner) && same(to, owner)) return 'self';
  return same(from, owner) ? 'out' : 'in';
}

export type OwnerView = { readonly owner: string; readonly direction: TxDirection };

/**
 * The rows one transfer gives the user: one for the sender when it is an own address, and one
 * for the recipient when that is another own address. `owners` holds lowercase addresses.
 */
export function ownerViews(from: string, to: string, owners: ReadonlySet<string>): OwnerView[] {
  const sender = from.toLowerCase();
  const recipient = to.toLowerCase();
  const views: OwnerView[] = [];
  if (owners.has(sender)) views.push({ owner: sender, direction: directionOf(from, to, from) });
  if (recipient !== sender && owners.has(recipient)) {
    views.push({ owner: recipient, direction: 'in' });
  }
  return views;
}

/** A transaction sent from this app, as a row of the account that sent it. */
export function recordToHistoryItem(record: LocalTxRecord): HistoryItem {
  return {
    hash: record.hash,
    owner: record.from.toLowerCase(),
    from: record.from,
    to: record.to,
    value: record.value,
    assetKey: record.assetKey,
    direction: directionOf(record.from, record.to, record.from),
    status: record.status,
    confirmations: record.confirmations,
    blockNumber: record.blockNumber,
    timestamp: record.createdAt,
    source: 'local',
  };
}
