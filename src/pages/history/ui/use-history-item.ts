import { network } from '@/entities/network';
import {
  recordToHistoryItem,
  useHistoryStore,
  useTxStore,
  type HistoryItem,
} from '@/entities/transaction';
import { useWalletStore } from '@/entities/wallet';

/**
 * A history row by hash: a local record (live status from the poller) first, else a row the
 * history scan found for this account.
 */
export function useHistoryItem(hash: string): HistoryItem | null {
  const owner = useWalletStore((state) => state.address) ?? '';
  const key = `${network.chainId}:${owner.toLowerCase()}`;
  const record = useTxStore((state) => state.records.find((r) => r.hash === hash));
  const scanned = useHistoryStore((state) =>
    state.entries[key]?.items.find((item) => item.hash.toLowerCase() === hash.toLowerCase()),
  );
  if (record) return recordToHistoryItem(record, owner);
  return scanned ?? null;
}
