import {
  recordToHistoryItem,
  useHistoryStore,
  useTxStore,
  type HistoryItem,
} from '@/entities/transaction';
import { isSameAddress } from '@/shared/lib';

/**
 * A history row by hash: a local record (live status from the poller) first, else a row the
 * history scan found. `owner` picks the side of a transfer between two own accounts.
 */
export function useHistoryItem(hash: string, owner?: string): HistoryItem | null {
  const isWanted = (address: string) => owner === undefined || isSameAddress(address, owner);
  const record = useTxStore((state) =>
    state.records.find((candidate) => candidate.hash === hash && isWanted(candidate.from)),
  );
  const scanned = useHistoryStore((state) =>
    Object.values(state.entries)
      .flatMap((entry) => entry.items)
      .find((item) => item.hash.toLowerCase() === hash.toLowerCase() && isWanted(item.owner)),
  );
  if (record) return recordToHistoryItem(record);
  return scanned ?? null;
}
