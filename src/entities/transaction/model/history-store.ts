import { create } from 'zustand';

import { logger } from '@/shared/lib';

import type { SourceContext, TransactionSource } from '../api/history-sources';
import { NATIVE_SCAN_WINDOW_BLOCKS } from '../config/tx-config';
import { mergeHistory } from '../lib/history';
import type { HistoryItem } from './types';

/** Chain history found so far for one account on one chain. */
export type HistoryEntry = {
  readonly items: readonly HistoryItem[];
  /** Next block per source id, or null when that source is exhausted. */
  readonly cursors: Readonly<Record<string, number | null>>;
  readonly context: SourceContext;
};

export type HistoryStatus = 'idle' | 'loading' | 'error';

type HistoryState = {
  entries: Readonly<Record<string, HistoryEntry>>;
  status: Readonly<Record<string, HistoryStatus>>;
  /** Loads the next page of every source that has more. The first call reads the head. */
  loadMore: (input: {
    key: string;
    owner: string;
    sources: readonly TransactionSource[];
    readHead: () => Promise<number>;
  }) => Promise<void>;
  /** Forgets the cursor for one key (pull-to-refresh starts again from the new head). */
  reset: (key: string) => void;
  clear: () => void;
};

function startEntry(owner: string, sources: readonly TransactionSource[], head: number) {
  const floor = Math.max(0, head - NATIVE_SCAN_WINDOW_BLOCKS + 1);
  const cursors = Object.fromEntries(sources.map((source) => [source.id, head]));
  return { items: [], cursors, context: { owner, head, floor } } satisfies HistoryEntry;
}

async function nextPage(entry: HistoryEntry, sources: readonly TransactionSource[]) {
  const pages = await Promise.all(
    sources.map(async (source) => {
      const cursor = entry.cursors[source.id];
      if (cursor === null || cursor === undefined) return { id: source.id, page: null };
      return { id: source.id, page: await source.loadPage(cursor, entry.context) };
    }),
  );
  const cursors = { ...entry.cursors };
  for (const { id, page } of pages) if (page) cursors[id] = page.nextCursor;
  const found = pages.flatMap(({ page }) => page?.items ?? []);
  return { ...entry, items: mergeHistory(entry.items, found), cursors };
}

/**
 * In memory: the cursor is cached per account and chain for this app session, and the scan
 * starts again (lazily) after a restart. Local records are persisted separately and merged in
 * by the caller, so sent transactions show at once.
 */
export const useHistoryStore = create<HistoryState>()((set, get) => ({
  entries: {},
  status: {},
  loadMore: async ({ key, owner, sources, readHead }) => {
    if (get().status[key] === 'loading') return;
    set({ status: { ...get().status, [key]: 'loading' } });
    try {
      const entry = get().entries[key] ?? startEntry(owner, sources, await readHead());
      const next = await nextPage(entry, sources);
      set({
        entries: { ...get().entries, [key]: next },
        status: { ...get().status, [key]: 'idle' },
      });
    } catch (error) {
      logger.warn('Loading history failed', { error });
      set({ status: { ...get().status, [key]: 'error' } });
    }
  },
  reset: (key) => {
    const { [key]: _removed, ...entries } = get().entries;
    set({ entries, status: { ...get().status, [key]: 'idle' } });
  },
  clear: () => set({ entries: {}, status: {} }),
}));

/** True while any source of the entry can still go further back. */
export function hasMoreHistory(entry: HistoryEntry | undefined): boolean {
  return entry === undefined || Object.values(entry.cursors).some((cursor) => cursor !== null);
}
