import { useCallback, useEffect, useMemo } from 'react';

import { useAllTokens } from '@/entities/asset';
import { getProvider, network } from '@/entities/network';
import {
  erc20LogsSource,
  hasMoreHistory,
  mergeHistory,
  nativeScanSource,
  recordToHistoryItem,
  useHistoryStore,
  useTxStore,
} from '@/entities/transaction';
import { useWalletStore } from '@/entities/wallet';
import { callRpc } from '@/shared/api';
import { isSameAddress } from '@/shared/lib';

/** Cache key: one history per account per chain. */
export const historyKey = (owner: string) => `${network.chainId}:${owner.toLowerCase()}`;

/**
 * The active account's history: local records (live status, shown at once) merged by hash with
 * the native block scan and ERC-20 logs, loaded a page at a time.
 */
export function useHistory() {
  const owner = useWalletStore((state) => state.address) ?? '';
  const key = historyKey(owner);
  const records = useTxStore((state) => state.records);
  const tokens = useAllTokens();
  const entry = useHistoryStore((state) => state.entries[key]);
  const status = useHistoryStore((state) => state.status[key] ?? 'idle');

  const items = useMemo(() => {
    const local = records
      .filter((record) => isSameAddress(record.from, owner))
      .map((record) => recordToHistoryItem(record, owner));
    return mergeHistory(local, entry?.items ?? []);
  }, [records, owner, entry]);

  const loadMore = useCallback(() => {
    if (owner === '') return;
    const provider = getProvider();
    void useHistoryStore.getState().loadMore({
      key,
      owner,
      sources: [
        nativeScanSource(provider),
        erc20LogsSource(
          provider,
          tokens.map((token) => token.address),
        ),
      ],
      readHead: () => callRpc(() => provider.getBlockNumber()),
    });
  }, [key, owner, tokens]);

  const hasEntry = entry !== undefined;
  useEffect(() => {
    if (!hasEntry) loadMore();
  }, [hasEntry, loadMore]);

  const refresh = useCallback(() => {
    useHistoryStore.getState().reset(key);
  }, [key]);

  return {
    items,
    status,
    hasMore: hasMoreHistory(entry),
    isFirstLoad: !hasEntry && status !== 'error',
    loadMore,
    refresh,
  };
}
