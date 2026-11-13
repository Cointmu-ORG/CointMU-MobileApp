import { useCallback, useEffect, useMemo } from 'react';

import { useAllTokens } from '@/entities/asset';
import { getProvider } from '@/entities/network';
import {
  erc20LogsSource,
  hasMoreHistory,
  mergeHistory,
  nativeScanSource,
  recordToHistoryItem,
  useHistoryStore,
  useTxStore,
} from '@/entities/transaction';
import { useUsableAccounts } from '@/entities/wallet';
import { callRpc } from '@/shared/api';

/**
 * History of every usable account, or of one of them when `filter` is its address: local records
 * (live status, shown at once) merged with the native block scan and ERC-20 logs. Pages are
 * always loaded for all accounts in one pass; the filter only chooses what is shown.
 */
export function useHistory(filter: string | null = null) {
  const accounts = useUsableAccounts();
  const owners = useMemo(
    () => accounts.map((account) => account.address.toLowerCase()),
    [accounts],
  );
  const records = useTxStore((state) => state.records);
  const tokens = useAllTokens();
  const entries = useHistoryStore((state) => state.entries);
  const status = useHistoryStore((state) => state.status);

  const items = useMemo(() => {
    const wanted = filter?.toLowerCase() ?? null;
    const shown = new Set(wanted === null ? owners : owners.filter((owner) => owner === wanted));
    const local = records
      .filter((record) => shown.has(record.from.toLowerCase()))
      .map(recordToHistoryItem);
    return mergeHistory(local, ...[...shown].map((owner) => entries[owner]?.items ?? []));
  }, [records, owners, entries, filter]);

  const loadMore = useCallback(() => {
    if (owners.length === 0) return;
    const provider = getProvider();
    void useHistoryStore.getState().loadMore({
      owners,
      sources: [
        nativeScanSource(provider),
        erc20LogsSource(
          provider,
          tokens.map((token) => token.address),
        ),
      ],
      readHead: () => callRpc(() => provider.getBlockNumber()),
    });
  }, [owners, tokens]);

  // Nothing found yet for some account (first open, a refresh, an account just added).
  const isMissing = owners.some((owner) => entries[owner] === undefined);
  useEffect(() => {
    if (isMissing) loadMore();
  }, [isMissing, loadMore]);

  return {
    items,
    status,
    hasMore: hasMoreHistory(entries, owners),
    isFirstLoad: isMissing && status !== 'error',
    loadMore,
    refresh: useHistoryStore.getState().reset,
  };
}
