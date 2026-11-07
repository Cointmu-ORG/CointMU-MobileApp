import { recordToHistoryItem, useTxStore, type HistoryItem } from '@/entities/transaction';
import { useWalletStore } from '@/entities/wallet';

/** A history row by hash: a local record (live status from the poller). */
export function useHistoryItem(hash: string): HistoryItem | null {
  const owner = useWalletStore((state) => state.address) ?? '';
  const record = useTxStore((state) => state.records.find((r) => r.hash === hash));
  return record ? recordToHistoryItem(record, owner) : null;
}
