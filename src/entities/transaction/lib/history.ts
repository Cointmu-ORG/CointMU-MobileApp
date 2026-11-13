import type { HistoryItem } from '../model/types';

export type BlockRange = { readonly from: number; readonly to: number };

/**
 * Newest-first block ranges of at most `size` blocks covering [from, to] (inclusive), so the
 * most recent history arrives first.
 */
export function chunkRange({ from, to }: BlockRange, size: number): BlockRange[] {
  const chunks: BlockRange[] = [];
  for (let top = to; top >= from; top -= size) {
    chunks.push({ from: Math.max(from, top - size + 1), to: top });
  }
  return chunks;
}

type ChunkOptions<T> = {
  readonly size: number;
  readonly minSize: number;
  readonly fetch: (range: BlockRange) => Promise<T[]>;
  /** Split only when the node answered with an error (range too wide); rethrow otherwise. */
  readonly shouldSplit?: (error: unknown) => boolean;
};

/**
 * Runs `fetch` over the range in chunks of `size`, newest first. When the node rejects a chunk
 * (too wide, too many results), that chunk is retried in halves down to `minSize`; below that,
 * or for an error `shouldSplit` refuses (e.g. the node is unreachable), the error is thrown.
 */
export async function fetchInChunks<T>(range: BlockRange, options: ChunkOptions<T>): Promise<T[]> {
  const { size, minSize, fetch, shouldSplit = () => true } = options;
  const results: T[] = [];
  for (const chunk of chunkRange(range, size)) {
    try {
      results.push(...(await fetch(chunk)));
    } catch (error) {
      const half = Math.floor(size / 2);
      if (half < minSize || !shouldSplit(error)) throw error;
      results.push(...(await fetchInChunks(chunk, { ...options, size: half })));
    }
  }
  return results;
}

const newestFirst = (a: HistoryItem, b: HistoryItem) => {
  // Not yet mined (null block) goes on top.
  const blockA = a.blockNumber ?? Number.MAX_SAFE_INTEGER;
  const blockB = b.blockNumber ?? Number.MAX_SAFE_INTEGER;
  return blockB - blockA || b.timestamp - a.timestamp;
};

/**
 * Merges every source into one newest-first list, one row per hash and own address. A local
 * record keeps its live status (the poller follows it), but takes the block and time the chain
 * reports.
 */
export function mergeHistory(...sources: readonly (readonly HistoryItem[])[]): HistoryItem[] {
  const byHash = new Map<string, HistoryItem>();
  for (const item of sources.flat()) {
    const key = `${item.hash}:${item.owner}`.toLowerCase();
    const existing = byHash.get(key);
    if (existing === undefined) {
      byHash.set(key, item);
      continue;
    }
    const [local, chain] = existing.source === 'local' ? [existing, item] : [item, existing];
    byHash.set(key, {
      ...local,
      blockNumber: local.blockNumber ?? chain.blockNumber,
      timestamp: chain.source === 'chain' ? chain.timestamp : local.timestamp,
    });
  }
  return [...byHash.values()].sort(newestFirst);
}
