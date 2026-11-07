import { observeTx, type TxReader } from '../api/observe-tx';
import { TX_POLICY } from '../config/tx-config';
import { isTxSettled, resolveTxStatus, type TrackedTx } from './tx-status';

const NOW = 1_700_000_000_000;
const NONCE = 7;
const MINED_AT = 1_000;
const TX: TrackedTx = { nonce: NONCE, createdAt: NOW };
const SENT = { hash: '0xabc', from: '0x0000000000000000000000000000000000000001' };

type ChainState = {
  nonce: number;
  receipt: { status: number | null; blockNumber: number } | null;
  isKnown: boolean;
  head: number;
};

/** Mocked provider: no test touches a real RPC (conventions: testing). */
function mockProvider(state: ChainState): TxReader {
  return {
    getTransactionCount: jest.fn(async () => state.nonce),
    getTransactionReceipt: jest.fn(async () => state.receipt),
    getTransaction: jest.fn(async () => (state.isKnown ? {} : null)),
    getBlockNumber: jest.fn(async () => state.head),
  } as unknown as TxReader; // Only the four read methods are used; the rest of ethers' types are irrelevant here.
}

async function poll(state: ChainState, now = NOW, tx = TX) {
  const obs = await observeTx(mockProvider(state), SENT, () => now);
  return resolveTxStatus(tx, obs, TX_POLICY);
}

const mined = (head: number, status: number | null = 1): ChainState => ({
  nonce: NONCE + 1,
  receipt: { status, blockNumber: MINED_AT },
  isKnown: true,
  head,
});

describe('tx status state machine', () => {
  it('is pending while the node knows the tx but has no receipt', async () => {
    await expect(
      poll({ nonce: NONCE, receipt: null, isKnown: true, head: MINED_AT }),
    ).resolves.toEqual({
      status: 'pending',
      confirmations: 0,
    });
  });

  it('walks pending → confirmed → final at FINAL_CONFIRMATIONS, never earlier', async () => {
    const final = TX_POLICY.finalConfirmations;
    await expect(poll(mined(MINED_AT))).resolves.toEqual({ status: 'confirmed', confirmations: 1 });
    await expect(poll(mined(MINED_AT + final - 2))).resolves.toEqual({
      status: 'confirmed',
      confirmations: final - 1,
    });
    await expect(poll(mined(MINED_AT + final - 1))).resolves.toEqual({
      status: 'final',
      confirmations: final,
    });
  });

  it('goes back to pending when a reorg removes the receipt', async () => {
    await expect(
      poll({ nonce: NONCE, receipt: null, isKnown: true, head: MINED_AT + 1 }),
    ).resolves.toEqual({
      status: 'pending',
      confirmations: 0,
    });
  });

  it('reports a reverted tx as failed', async () => {
    await expect(poll(mined(MINED_AT, 0))).resolves.toEqual({ status: 'failed', confirmations: 1 });
  });

  it('treats a pre-Byzantium receipt (status null) as success', async () => {
    await expect(poll(mined(MINED_AT, null))).resolves.toMatchObject({ status: 'confirmed' });
  });

  it('never reports fewer than 1 confirmation when the node head lags the receipt', async () => {
    await expect(poll(mined(MINED_AT - 2))).resolves.toEqual({
      status: 'confirmed',
      confirmations: 1,
    });
  });

  it('detects a replacement: unknown tx, nonce already used', async () => {
    await expect(
      poll({ nonce: NONCE + 1, receipt: null, isKnown: false, head: MINED_AT }),
    ).resolves.toEqual({
      status: 'replaced',
      confirmations: 0,
    });
  });

  it('marks an unknown tx with an unused nonce dropped only after the grace period', async () => {
    const unknown = { nonce: NONCE, receipt: null, isKnown: false, head: MINED_AT };
    await expect(poll(unknown, NOW + TX_POLICY.droppedAfterMs - 1)).resolves.toMatchObject({
      status: 'pending',
    });
    await expect(poll(unknown, NOW + TX_POLICY.droppedAfterMs)).resolves.toMatchObject({
      status: 'dropped',
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

describe('isTxSettled', () => {
  const final = TX_POLICY.finalConfirmations;

  it('stops on final, replaced and dropped', () => {
    for (const status of ['final', 'replaced', 'dropped'] as const) {
      expect(isTxSettled({ status, confirmations: final }, TX_POLICY)).toBe(true);
    }
  });

  it('keeps polling pending, confirmed, and a failed tx until it is as deep as a final one', () => {
    expect(isTxSettled({ status: 'pending', confirmations: 0 }, TX_POLICY)).toBe(false);
    expect(isTxSettled({ status: 'confirmed', confirmations: final - 1 }, TX_POLICY)).toBe(false);
    expect(isTxSettled({ status: 'failed', confirmations: final - 1 }, TX_POLICY)).toBe(false);
    expect(isTxSettled({ status: 'failed', confirmations: final }, TX_POLICY)).toBe(true);
  });
});
