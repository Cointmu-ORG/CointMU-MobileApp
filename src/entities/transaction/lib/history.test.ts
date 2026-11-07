import type { HistoryItem } from '../model/types';
import { chunkRange, fetchInChunks, mergeHistory, type BlockRange } from './history';

const NODE_LIMIT_BLOCKS = 300;

function item(hash: string, patch: Partial<HistoryItem> = {}): HistoryItem {
  return {
    hash,
    from: '0x01',
    to: '0x02',
    value: '1',
    assetKey: 'native',
    direction: 'in',
    status: 'confirmed',
    confirmations: 1,
    blockNumber: 100,
    timestamp: 1_000,
    source: 'chain',
    ...patch,
  };
}

describe('chunkRange', () => {
  it('splits newest first and covers every block once', () => {
    expect(chunkRange({ from: 1, to: 10 }, 4)).toEqual([
      { from: 7, to: 10 },
      { from: 3, to: 6 },
      { from: 1, to: 2 },
    ]);
  });

  it('gives one chunk when the range fits and none when it is empty', () => {
    expect(chunkRange({ from: 5, to: 6 }, 10)).toEqual([{ from: 5, to: 6 }]);
    expect(chunkRange({ from: 6, to: 5 }, 10)).toEqual([]);
  });
});

describe('fetchInChunks', () => {
  /** A node that rejects any range wider than NODE_LIMIT_BLOCKS and returns each range's start. */
  const limitedNode = jest.fn(async ({ from, to }: BlockRange) => {
    if (to - from + 1 > NODE_LIMIT_BLOCKS)
      throw new Error('query returned more than 10000 results');
    return [from];
  });

  beforeEach(() => limitedNode.mockClear());

  it('falls back to smaller chunks when the node rejects a range', async () => {
    const starts = await fetchInChunks(
      { from: 1, to: 1_000 },
      { size: 1_000, minSize: 100, fetch: limitedNode },
    );
    // 1000 → rejected; 500s → rejected; 250-block chunks pass and still cover everything.
    expect(starts).toEqual([751, 501, 251, 1]);
  });

  it('gives up below the minimum chunk size', async () => {
    await expect(
      fetchInChunks({ from: 1, to: 1_000 }, { size: 1_000, minSize: 500, fetch: limitedNode }),
    ).rejects.toThrow('more than 10000');
  });

  it('does not split when the error is not a range rejection', async () => {
    const down = jest.fn(async () => {
      throw new Error('network down');
    });
    await expect(
      fetchInChunks(
        { from: 1, to: 1_000 },
        { size: 1_000, minSize: 100, fetch: down, shouldSplit: () => false },
      ),
    ).rejects.toThrow('network down');
    expect(down).toHaveBeenCalledTimes(1);
  });
});

describe('mergeHistory', () => {
  it('dedupes by hash, keeping the live local status and the chain block time', () => {
    const local = item('0xAA', {
      source: 'local',
      status: 'pending',
      blockNumber: null,
      timestamp: 5,
    });
    const chain = item('0xaa', { status: 'final', blockNumber: 120, timestamp: 9_000 });
    expect(mergeHistory([local], [chain])).toEqual([
      { ...local, blockNumber: 120, timestamp: 9_000 },
    ]);
  });

  it('sorts unmined first, then by block, newest first', () => {
    const merged = mergeHistory(
      [item('0x1', { blockNumber: 50 }), item('0x2', { blockNumber: null, source: 'local' })],
      [item('0x3', { blockNumber: 70 })],
    );
    expect(merged.map((entry) => entry.hash)).toEqual(['0x2', '0x3', '0x1']);
  });
});
