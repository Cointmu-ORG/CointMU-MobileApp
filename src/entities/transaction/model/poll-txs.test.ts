import type { TxReader } from '../api/observe-tx';
import { TX_POLICY, TX_POLL_INTERVAL_MS, TX_POLL_MAX_BACKOFF_MS } from '../config/tx-config';
import { nextPollDelayMs } from '../lib/poll-schedule';
import { pollUnsettledTxs, selectUnsettled } from './poll-txs';
import { useTxStore } from './tx-store';
import type { LocalTxRecord } from './types';

const NOW = 1_700_000_000_000;
const MINED_AT = 500;
const BIG_FAILURE_COUNT = 20;

function record(hash: string, patch: Partial<LocalTxRecord> = {}): LocalTxRecord {
  return {
    hash,
    from: '0x0000000000000000000000000000000000000001',
    to: '0x0000000000000000000000000000000000000002',
    value: '1',
    assetKey: 'native',
    nonce: 4,
    fee: { mode: 'legacy', gasLimit: '21000', gasPrice: '1' },
    node: 'http://rpc.test.invalid',
    createdAt: NOW,
    status: 'pending',
    confirmations: 0,
    blockNumber: null,
    unknownSince: null,
    ...patch,
  };
}

/** Mocked provider: the tx is mined at MINED_AT with the given head. No real RPC. */
function minedProvider(head: number, failFor?: string): TxReader {
  return {
    getTransactionCount: jest.fn(async () => 5),
    getTransactionReceipt: jest.fn(async (hash: string) => {
      if (hash === failFor) throw new Error('node down');
      return { status: 1, blockNumber: MINED_AT };
    }),
    getTransaction: jest.fn(async () => ({ blockNumber: MINED_AT })),
    getBlockNumber: jest.fn(async () => head),
  } as unknown as TxReader; // Only the four read methods are used.
}

beforeEach(() => {
  useTxStore.getState().clear();
});

describe('pollUnsettledTxs', () => {
  it('moves pending records to confirmed and leaves settled ones alone', async () => {
    useTxStore.getState().add(record('0xa'));
    useTxStore.getState().add(record('0xb', { status: 'final', confirmations: 20 }));
    await pollUnsettledTxs(minedProvider(MINED_AT + 2), () => NOW);
    const byHash = Object.fromEntries(useTxStore.getState().records.map((r) => [r.hash, r]));
    expect(byHash['0xa']).toMatchObject({
      status: 'confirmed',
      confirmations: 3,
      blockNumber: MINED_AT,
    });
    expect(byHash['0xb']).toMatchObject({ status: 'final', confirmations: 20 });
  });

  it('never marks a record final before FINAL_CONFIRMATIONS', async () => {
    useTxStore.getState().add(record('0xa'));
    await pollUnsettledTxs(minedProvider(MINED_AT + TX_POLICY.finalConfirmations - 2), () => NOW);
    expect(useTxStore.getState().records[0]?.status).toBe('confirmed');
    await pollUnsettledTxs(minedProvider(MINED_AT + TX_POLICY.finalConfirmations - 1), () => NOW);
    expect(useTxStore.getState().records[0]?.status).toBe('final');
    expect(selectUnsettled(useTxStore.getState().records)).toHaveLength(0);
  });

  it('saves the records it could read and rejects so the poller backs off', async () => {
    useTxStore.getState().add(record('0xa'));
    useTxStore.getState().add(record('0xbad'));
    await expect(pollUnsettledTxs(minedProvider(MINED_AT, '0xbad'), () => NOW)).rejects.toThrow();
    const byHash = Object.fromEntries(useTxStore.getState().records.map((r) => [r.hash, r]));
    expect(byHash['0xa']?.status).toBe('confirmed');
    expect(byHash['0xbad']?.status).toBe('pending');
  });
});

describe('nextPollDelayMs', () => {
  it('doubles per failure and stops at the cap', () => {
    expect(nextPollDelayMs(0)).toBe(TX_POLL_INTERVAL_MS);
    expect(nextPollDelayMs(1)).toBe(TX_POLL_INTERVAL_MS * 2);
    expect(nextPollDelayMs(BIG_FAILURE_COUNT)).toBe(TX_POLL_MAX_BACKOFF_MS);
  });
});
