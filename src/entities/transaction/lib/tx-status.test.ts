import { observeTx, type TxReader } from '../api/observe-tx';
import { TX_POLICY } from '../config/tx-config';
import { isTxSettled, resolveTxStatus, type NodeTxState, type TrackedTx } from './tx-status';

const NOW = 1_700_000_000_000;
const NONCE = 7;
const MINED_AT = 1_000;
const HOUR_MS = 3_600_000;
const NODE_SWITCH_GAP_MS = 20_000;
const TX: TrackedTx = { nonce: NONCE, unknownSince: null };
const SENT = { hash: '0xabc', from: '0x0000000000000000000000000000000000000001' };
const { droppedAfterMs, finalConfirmations } = TX_POLICY;

type ChainState = {
  nonce: number;
  receipt: { status: number | null; blockNumber: number } | null;
  nodeTx: NodeTxState;
  head: number;
};

const NODE_TX: Record<NodeTxState, { blockNumber: number | null } | null> = {
  unknown: null,
  pending: { blockNumber: null },
  mined: { blockNumber: MINED_AT },
};

/** Mocked provider: no test touches a real RPC (conventions: testing). */
function mockProvider(state: ChainState): TxReader {
  return {
    getTransactionCount: jest.fn(async () => state.nonce),
    getTransactionReceipt: jest.fn(async () => state.receipt),
    getTransaction: jest.fn(async () => NODE_TX[state.nodeTx]),
    getBlockNumber: jest.fn(async () => state.head),
  } as unknown as TxReader; // Only the four read methods are used; the rest of ethers' types are irrelevant here.
}

async function poll(state: ChainState, now = NOW, tx = TX) {
  const obs = await observeTx(mockProvider(state), SENT, () => now);
  return resolveTxStatus(tx, obs, TX_POLICY);
}

const inPool: ChainState = { nonce: NONCE, receipt: null, nodeTx: 'pending', head: MINED_AT };
const unknown: ChainState = { ...inPool, nodeTx: 'unknown' };
const mined = (head: number, status: number | null = 1): ChainState => ({
  nonce: NONCE + 1,
  receipt: { status, blockNumber: MINED_AT },
  nodeTx: 'mined',
  head,
});

describe('tx status: receipts and finality', () => {
  it('walks confirmed → final at FINAL_CONFIRMATIONS, never earlier', async () => {
    await expect(poll(mined(MINED_AT))).resolves.toMatchObject({
      status: 'confirmed',
      confirmations: 1,
    });
    await expect(poll(mined(MINED_AT + finalConfirmations - 2))).resolves.toMatchObject({
      status: 'confirmed',
      confirmations: finalConfirmations - 1,
    });
    await expect(poll(mined(MINED_AT + finalConfirmations - 1))).resolves.toMatchObject({
      status: 'final',
      confirmations: finalConfirmations,
    });
  });

  it('reports a reverted tx as failed', async () => {
    await expect(poll(mined(MINED_AT, 0))).resolves.toMatchObject({ status: 'failed' });
  });

  it('treats a pre-Byzantium receipt (status null) as success', async () => {
    await expect(poll(mined(MINED_AT, null))).resolves.toMatchObject({ status: 'confirmed' });
  });

  it('never reports fewer than 1 confirmation when the node head lags the receipt', async () => {
    await expect(poll(mined(MINED_AT - 2))).resolves.toMatchObject({ confirmations: 1 });
  });

  it('waits for the receipt of a tx the node reports in a block', async () => {
    await expect(poll({ ...mined(MINED_AT), receipt: null })).resolves.toMatchObject({
      status: 'pending',
    });
  });

  it('goes back to pending when a reorg removes the receipt', async () => {
    await expect(poll({ ...inPool, head: MINED_AT + 1 })).resolves.toEqual({
      status: 'pending',
      confirmations: 0,
      unknownSince: null,
    });
  });

  it('reads the nonce before the receipt', async () => {
    const provider = mockProvider(mined(MINED_AT));
    await observeTx(provider, SENT, () => NOW);
    const nonceOrder = jest.mocked(provider.getTransactionCount).mock.invocationCallOrder;
    const receiptOrder = jest.mocked(provider.getTransactionReceipt).mock.invocationCallOrder;
    expect(Math.max(...nonceOrder)).toBeLessThan(Math.min(...receiptOrder));
  });
});

describe('tx status: dropped and replaced', () => {
  it('keeps a long-pending tx the node still knows pending, never dropped', async () => {
    const longAgo = { nonce: NONCE, unknownSince: NOW - HOUR_MS };
    await expect(poll(inPool, NOW + HOUR_MS, longAgo)).resolves.toEqual({
      status: 'pending',
      confirmations: 0,
      unknownSince: null,
    });
  });

  it('does not drop a tx that is briefly unknown during a node switch', async () => {
    const first = await poll(unknown, NOW);
    expect(first).toEqual({ status: 'pending', confirmations: 0, unknownSince: NOW });
    const later = await poll(unknown, NOW + NODE_SWITCH_GAP_MS, {
      nonce: NONCE,
      unknownSince: NOW,
    });
    expect(later.status).toBe('pending');
    // Back on a node that knows it: the unknown window resets.
    const known = await poll(inPool, NOW + NODE_SWITCH_GAP_MS * 2, {
      nonce: NONCE,
      unknownSince: NOW,
    });
    expect(known.unknownSince).toBeNull();
  });

  it('drops an unknown tx with an unused nonce only after the full window', async () => {
    const tracked = { nonce: NONCE, unknownSince: NOW };
    await expect(poll(unknown, NOW + droppedAfterMs - 1, tracked)).resolves.toMatchObject({
      status: 'pending',
    });
    await expect(poll(unknown, NOW + droppedAfterMs, tracked)).resolves.toMatchObject({
      status: 'dropped',
    });
  });

  it('reports replaced when the nonce is used and our hash has no receipt', async () => {
    await expect(poll({ ...unknown, nonce: NONCE + 1 })).resolves.toMatchObject({
      status: 'replaced',
    });
    // Even if this node still holds our tx in its pool, it can never be mined now.
    await expect(poll({ ...inPool, nonce: NONCE + 1 })).resolves.toMatchObject({
      status: 'replaced',
    });
  });
});

describe('isTxSettled', () => {
  it('stops on final, replaced and dropped', () => {
    for (const status of ['final', 'replaced', 'dropped'] as const) {
      expect(isTxSettled({ status, confirmations: finalConfirmations }, TX_POLICY)).toBe(true);
    }
  });

  it('keeps polling pending, confirmed, and a failed tx until it is as deep as a final one', () => {
    const depth = finalConfirmations - 1;
    expect(isTxSettled({ status: 'pending', confirmations: 0 }, TX_POLICY)).toBe(false);
    expect(isTxSettled({ status: 'confirmed', confirmations: depth }, TX_POLICY)).toBe(false);
    expect(isTxSettled({ status: 'failed', confirmations: depth }, TX_POLICY)).toBe(false);
    expect(isTxSettled({ status: 'failed', confirmations: finalConfirmations }, TX_POLICY)).toBe(
      true,
    );
  });
});
