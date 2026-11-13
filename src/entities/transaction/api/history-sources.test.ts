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
const SECOND = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
const owner = OWNER.toLowerCase();
const second = SECOND.toLowerCase();
const FLOOR = HEAD - NATIVE_SCAN_WINDOW_BLOCKS + 1;
const CONTEXT = { owners: [owner], head: HEAD, floor: FLOOR };
const BOTH = { owners: [owner, second], head: HEAD, floor: FLOOR };
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

  it('checks every own address in one pass: each block is fetched once', async () => {
    const chain = fakeChain([
      { hash: '0xfirst', from: OTHER, to: OWNER, value: 5n, blockNumber: HEAD },
      { hash: '0xsecond', from: SECOND, to: OTHER, value: 7n, blockNumber: HEAD - 1 },
      { hash: '0xbetween', from: OWNER, to: SECOND, value: 2n, blockNumber: HEAD - 2 },
      { hash: '0xself', from: SECOND, to: SECOND, value: 1n, blockNumber: HEAD - 3 },
    ]);
    const page = await nativeScanSource(chain).loadPage(HEAD, BOTH);

    expect(chain.getBlock).toHaveBeenCalledTimes(NATIVE_SCAN_PAGE_BLOCKS);
    const rows = page.items.map((item) => `${item.hash} ${item.owner} ${item.direction}`).sort();
    expect(rows).toEqual(
      [
        `0xfirst ${owner} in`,
        `0xsecond ${second} out`,
        // Between two own accounts: one row for each side, and one receipt for the tx.
        `0xbetween ${owner} out`,
        `0xbetween ${second} in`,
        `0xself ${second} self`,
      ].sort(),
    );
    expect(chain.getTransactionReceipt).toHaveBeenCalledTimes(4);
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

  it('asks for all own addresses with topic OR-arrays and counts an own-to-own log once', async () => {
    const chain = fakeChain([]);
    const between = {
      transactionHash: '0xbetween',
      index: 4,
      address: TOKEN,
      blockNumber: HEAD - 2,
      data: '0x0f',
      topics: [TRANSFER, zeroPadValue(OWNER, 32), zeroPadValue(SECOND, 32)],
    };
    // Sent by one own address and received by another: both queries return the same log.
    jest.mocked(chain.getLogs).mockResolvedValue([between] as never);
    const page = await erc20LogsSource(chain, [TOKEN]).loadPage(HEAD, BOTH);

    const ownerTopics = [zeroPadValue(owner, 32), zeroPadValue(second, 32)];
    const topics = jest.mocked(chain.getLogs).mock.calls.map(([filter]) => filter.topics);
    expect(topics).toEqual([
      [TRANSFER, ownerTopics],
      [TRANSFER, null, ownerTopics],
    ]);
    expect(page.items.map((item) => [item.owner, item.direction])).toEqual([
      [owner, 'out'],
      [second, 'in'],
    ]);
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
  const store = () => useHistoryStore.getState();
  const readHead = async () => HEAD;

  it('pages backwards per source and dedupes by hash', async () => {
    const chain = fakeChain([
      { hash: '0xin', from: OTHER, to: OWNER, value: 5n, blockNumber: HEAD },
    ]);
    const local = localSource([
      {
        hash: '0xIN',
        owner,
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
    await store().loadMore({
      owners: [OWNER],
      sources: [local, nativeScanSource(chain)],
      readHead,
    });
    const entry = store().entries[owner];
    expect(entry?.items).toHaveLength(1);
    expect(entry?.items[0]).toMatchObject({ source: 'local', blockNumber: HEAD });
    expect(entry?.cursors).toEqual({ local: null, native: HEAD - NATIVE_SCAN_PAGE_BLOCKS });
    expect(store().session).toEqual({ head: HEAD, floor: FLOOR });
    expect(hasMoreHistory(store().entries, [OWNER])).toBe(true);
  });

  it('scans all addresses together and files each row under its own address', async () => {
    const chain = fakeChain([
      { hash: '0xa', from: OTHER, to: OWNER, value: 5n, blockNumber: HEAD },
      { hash: '0xb', from: SECOND, to: OTHER, value: 7n, blockNumber: HEAD - 1 },
    ]);
    const native = nativeScanSource(chain);
    const loadPage = jest.spyOn(native, 'loadPage');
    await store().loadMore({ owners: [OWNER, SECOND], sources: [native], readHead });

    expect(loadPage).toHaveBeenCalledTimes(1);
    expect(loadPage.mock.calls[0]?.[1].owners).toEqual([owner, second]);
    expect(chain.getBlock).toHaveBeenCalledTimes(NATIVE_SCAN_PAGE_BLOCKS);
    expect(store().entries[owner]?.items.map((item) => item.hash)).toEqual(['0xa']);
    expect(store().entries[second]?.items.map((item) => item.hash)).toEqual(['0xb']);
  });

  it('scans only the new address after an account is added, then pages them together', async () => {
    const chain = fakeChain([
      { hash: '0xa', from: OTHER, to: OWNER, value: 5n, blockNumber: HEAD },
      { hash: '0xb', from: OTHER, to: SECOND, value: 7n, blockNumber: HEAD - 1 },
    ]);
    const native = nativeScanSource(chain);
    const loadPage = jest.spyOn(native, 'loadPage');
    const firstPageEnd = HEAD - NATIVE_SCAN_PAGE_BLOCKS;
    await store().loadMore({ owners: [OWNER], sources: [native], readHead });
    const found = store().entries[owner]?.items;

    // The account is added: the first page is scanned for it alone, from the same head.
    await store().loadMore({ owners: [OWNER, SECOND], sources: [native], readHead });
    expect(loadPage.mock.calls[1]).toEqual([HEAD, { owners: [second], head: HEAD, floor: FLOOR }]);
    expect(store().entries[owner]?.items).toBe(found);
    expect(store().entries[second]?.items.map((item) => item.hash)).toEqual(['0xb']);
    expect(store().entries[second]?.cursors.native).toBe(firstPageEnd);

    // Caught up: the next page is one pass for both.
    await store().loadMore({ owners: [OWNER, SECOND], sources: [native], readHead });
    expect(loadPage.mock.calls[2]?.[0]).toBe(firstPageEnd);
    expect(loadPage.mock.calls[2]?.[1].owners).toEqual([owner, second]);
  });

  it('drops a page that was still loading when the history was reset', async () => {
    let release: (page: { items: []; nextCursor: null }) => void = () => undefined;
    const slow = {
      id: 'native',
      loadPage: jest.fn(() => new Promise<{ items: []; nextCursor: null }>((r) => (release = r))),
    };
    const loading = store().loadMore({ owners: [OWNER], sources: [slow], readHead });
    await Promise.resolve();
    store().reset();
    release({ items: [], nextCursor: null });
    await loading;
    expect(store().entries).toEqual({});
    expect(store().status).toBe('idle');
  });

  it('records an error status when a source fails', async () => {
    const failing = { id: 'native', loadPage: jest.fn(async () => Promise.reject(new Error('x'))) };
    await store().loadMore({ owners: [OWNER], sources: [failing], readHead });
    expect(store().status).toBe('error');
  });
});
