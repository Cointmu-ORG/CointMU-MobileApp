import { create } from 'zustand';

import { logger } from '@/shared/lib';

import type { SourcePage, TransactionSource } from '../api/history-sources';
import { NATIVE_SCAN_WINDOW_BLOCKS } from '../config/tx-config';
import { mergeHistory } from '../lib/history';
import type { HistoryItem } from './types';

/** Chain history found so far for one own address. */
export type HistoryEntry = {
  readonly items: readonly HistoryItem[];
  /** Next block per source id, or null when that source is exhausted. */
  readonly cursors: Readonly<Record<string, number | null>>;
};

/** The block range of this history session, shared by every address so their pages line up. */
export type HistorySession = { readonly head: number; readonly floor: number };

export type HistoryStatus = 'idle' | 'loading' | 'error';

type LoadInput = {
  /** Every own address to keep history for. */
  readonly owners: readonly string[];
  readonly sources: readonly TransactionSource[];
  readonly readHead: () => Promise<number>;
};

type HistoryState = {
  session: HistorySession | null;
  /** Keyed by lowercase address. */
  entries: Readonly<Record<string, HistoryEntry>>;
  status: HistoryStatus;
  /**
   * Loads one more page per source, for all the addresses that are least far back in that
   * source together (one pass per block, never one per address). The first call reads the head.
   * An address added later starts at the session head and catches up page by page, while the
   * addresses already scanned keep what they have.
   */
  loadMore: (input: LoadInput) => Promise<void>;
  /** Forgets everything found (pull-to-refresh starts again from the new head). */
  reset: () => void;
  clear: () => void;
};

type Entries = Record<string, HistoryEntry>;
type GroupPage = { readonly id: string; readonly group: readonly string[]; page: SourcePage };

function withNewOwners(entries: Entries, input: LoadInput, head: number): Entries {
  const next = { ...entries };
  for (const owner of input.owners) {
    next[owner] ??= {
      items: [],
      cursors: Object.fromEntries(input.sources.map((source) => [source.id, head])),
    };
  }
  return next;
}

/** One page of one source, for the addresses whose cursor in it is the highest. */
async function loadGroupPage(
  source: TransactionSource,
  entries: Entries,
  owners: readonly string[],
  session: HistorySession,
): Promise<GroupPage | null> {
  const cursorOf = (owner: string) => entries[owner]?.cursors[source.id] ?? null;
  const cursor = Math.max(-1, ...owners.map((owner) => cursorOf(owner) ?? -1));
  if (cursor < 0) return null;
  const group = owners.filter((owner) => cursorOf(owner) === cursor);
  const page = await source.loadPage(cursor, { owners: group, ...session });
  return { id: source.id, group, page };
}

function applyPage(entries: Entries, { id, group, page }: GroupPage): Entries {
  const next = { ...entries };
  for (const owner of group) {
    const entry = next[owner];
    if (entry === undefined) continue;
    const found = page.items.filter((item) => item.owner === owner);
    next[owner] = {
      items: mergeHistory(entry.items, found),
      cursors: { ...entry.cursors, [id]: page.nextCursor },
    };
  }
  return next;
}

// A reset while a page is in flight makes that page stale; its result is dropped.
let generation = 0;

/**
 * In memory: what was found is cached per address for this app session, and the scan starts
 * again (lazily) after a restart. Local records are persisted separately and merged in by the
 * caller, so sent transactions show at once.
 */
export const useHistoryStore = create<HistoryState>()((set, get) => ({
  session: null,
  entries: {},
  status: 'idle',
  loadMore: async (input) => {
    if (get().status === 'loading') return;
    const startedIn = generation;
    set({ status: 'loading' });
    try {
      const owners = input.owners.map((owner) => owner.toLowerCase());
      const head = get().session?.head ?? (await input.readHead());
      const session = { head, floor: Math.max(0, head - NATIVE_SCAN_WINDOW_BLOCKS + 1) };
      const entries = withNewOwners(get().entries, { ...input, owners }, head);
      const pages = await Promise.all(
        input.sources.map((source) => loadGroupPage(source, entries, owners, session)),
      );
      if (startedIn !== generation) return;
      const loaded = pages.filter((page) => page !== null).reduce(applyPage, entries);
      set({ session, entries: loaded, status: 'idle' });
    } catch (error) {
      if (startedIn !== generation) return;
      logger.warn('Loading history failed', { error });
      set({ status: 'error' });
    }
  },
  reset: () => {
    generation += 1;
    set({ session: null, entries: {}, status: 'idle' });
  },
  clear: () => get().reset(),
}));

/** True while any source can still go further back for any of these addresses. */
export function hasMoreHistory(entries: Readonly<Entries>, owners: readonly string[]): boolean {
  return owners.some((owner) => {
    const entry = entries[owner.toLowerCase()];
    return entry === undefined || Object.values(entry.cursors).some((cursor) => cursor !== null);
  });
}
