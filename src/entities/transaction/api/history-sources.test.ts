import { id, zeroPadValue } from 'ethers';

import { NATIVE_SCAN_PAGE_BLOCKS, NATIVE_SCAN_WINDOW_BLOCKS, TX_POLICY } from '../config/tx-config';
import { hasMoreHistory, useHistoryStore } from '../model/history-store';
import {
  erc20LogsSource,
  localSource,
  nativeScanSource,
  type HistoryReader,
} from './history-sources';

const OWNER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const OTHER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const TOKEN = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const HEAD = 100_000;
const BLOCK_TIME_S = 1_700_000_000;
const MS = 1000;
const CONTEXT = { owner: OWNER, head: HEAD, floor: HEAD - NATIVE_SCAN_WINDOW_BLOCKS + 1 };
const TRANSFER = id('Transfer(address,address,uint256)');

type FakeTx = { hash: string; from: string; to: string | null; value: bigint; blockNumber: number };

/** A chain where only the listed blocks hold transactions. No real RPC. */
function fakeChain(txs: readonly FakeTx[], reverted: readonly string[] = []): HistoryReader {
  return {
    getBlock: jest.fn(async (n: number) => ({
      timestamp: BLOCK_TIME_S + n,
      prefetchedTransactions: txs.filter((tx) => tx.blockNumber === n),
    })),
    getTransactionReceipt: jest.fn(async (hash: string) => ({
      status: reverted.includes(hash) ? 0 : 1,
      blockNumber: txs.find((tx) => tx.hash === hash)?.blockNumber ?? 0,
    })),
    getLogs: jest.fn(async () => []),
  } as unknown as HistoryReader; // Only getBlock, getTransactionReceipt and getLogs are used.
}

describe('nativeScanSource', () => {
  it('finds value transfers in and out, skips zero-value calls, marks reverts failed', async () => {
    const chain = fakeChain(
      [
        { hash: '0xin', from: OTHER, to: OWNER, value: 5n, blockNumber: HEAD },
        { hash: '0xout', from: OWNER, to: OTHER, value: 7n, blockNumber: HEAD - 20 },
        { hash: '0xtoken', from: OWNER, to: TOKEN, value: 0n, blockNumber: HEAD - 1 },
        { hash: '0xnotmine', from: OTHER, to: TOKEN, value: 9n, blockNumber: HEAD - 2 },
        { hash: '0xfail', from: OWNER, to: OTHER, value: 1n, blockNumber: HEAD - 3 },
      ],
      ['0xfail'],
    );
    const page = await nativeScanSource(chain).loadPage(HEAD, CONTEXT);
    const byHash = Object.fromEntries(page.items.map((item) => [item.hash, item]));

    expect(Object.keys(byHash).sort()).toEqual(['0xfail', '0xin', '0xout']);
    expect(byHash['0xin']).toMatchObject({
      direction: 'in',
      status: 'confirmed',
      confirmations: 1,
      timestamp: (BLOCK_TIME_S + HEAD) * MS,
    });
    expect(byHash['0xout']).toMatchObject({ direction: 'out', status: 'final', confirmations: 21 });
    expect(byHash['0xfail']?.status).toBe('failed');
    expect(page.nextCursor).toBe(HEAD - NATIVE_SCAN_PAGE_BLOCKS);
  });

  it('never marks a tx final before FINAL_CONFIRMATIONS', async () => {
    const depth = TX_POLICY.finalConfirmations - 1;
    const chain = fakeChain([
      { hash: '0xa', from: OTHER, to: OWNER, value: 1n, blockNumber: HEAD - depth + 1 },
    ]);
    const [item] = (await nativeScanSource(chain).loadPage(HEAD, CONTEXT)).items;
    expect(item).toMatchObject({ status: 'confirmed', confirmations: depth });
  });

  it('stops at the window floor', async () => {
    const chain = fakeChain([]);
    const page = await nativeScanSource(chain).loadPage(CONTEXT.floor + 10, CONTEXT);
    expect(page.nextCursor).toBeNull();
  });
});

describe('erc20LogsSource', () => {
  it('turns Transfer logs into rows for the token, both directions', async () => {
    const chain = fakeChain([]);
    jest.mocked(chain.getLogs).mockImplementation(async (filter) => {
      const isSent = (filter.topics?.[1] ?? null) !== null;
      return [
        {
          transactionHash: isSent ? '0xsent' : '0xgot',
          address: TOKEN,
          blockNumber: HEAD - 2,
          data: '0x0f',
          topics: [
            TRANSFER,
            zeroPadValue(isSent ? OWNER : OTHER, 32),
            zeroPadValue(isSent ? OTHER : OWNER, 32),
          ],
        },
      ] as never;
    });
    const page = await erc20LogsSource(chain, [TOKEN]).loadPage(HEAD, CONTEXT);
    expect(page.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ hash: '0xsent', direction: 'out', to: OTHER, value: '15' }),
        expect.objectContaining({
          hash: '0xgot',
          direction: 'in',
          from: OTHER,
          assetKey: TOKEN.toLowerCase(),
        }),
      ]),
    );
  });

  it('is done at once when no tokens are listed', async () => {
    const chain = fakeChain([]);
    await expect(erc20LogsSource(chain, []).loadPage(HEAD, CONTEXT)).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
    expect(chain.getLogs).not.toHaveBeenCalled();
  });
});

describe('history store', () => {
  beforeEach(() => useHistoryStore.getState().clear());

  it('pages backwards per source and dedupes by hash', async () => {
    const chain = fakeChain([
      { hash: '0xin', from: OTHER, to: OWNER, value: 5n, blockNumber: HEAD },
    ]);
    const local = localSource([
      {
        hash: '0xIN',
        from: OTHER,
        to: OWNER,
        value: '5',
        assetKey: 'native',
        direction: 'in',
        status: 'pending',
        confirmations: 0,
        blockNumber: null,
        timestamp: 1,
        source: 'local',
      },
    ]);
    const input = {
      key: `1912:${OWNER}`,
      owner: OWNER,
      sources: [local, nativeScanSource(chain)],
      readHead: async () => HEAD,
    };
    await useHistoryStore.getState().loadMore(input);
    const entry = useHistoryStore.getState().entries[input.key];
    expect(entry?.items).toHaveLength(1);
    expect(entry?.items[0]).toMatchObject({ source: 'local', blockNumber: HEAD });
    expect(entry?.cursors).toEqual({ local: null, native: HEAD - NATIVE_SCAN_PAGE_BLOCKS });
    expect(hasMoreHistory(entry)).toBe(true);
  });

  it('records an error status when a source fails', async () => {
    const failing = { id: 'native', loadPage: jest.fn(async () => Promise.reject(new Error('x'))) };
    await useHistoryStore
      .getState()
      .loadMore({ key: 'k', owner: OWNER, sources: [failing], readHead: async () => HEAD });
    expect(useHistoryStore.getState().status.k).toBe('error');
  });
});
