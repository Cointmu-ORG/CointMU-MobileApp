import { act, render, screen } from '@testing-library/react-native';

import { useHistoryStore, useTxStore } from '@/entities/transaction';
import { useWalletStore } from '@/entities/wallet';
import { RPC_MAX_RETRIES, RPC_RETRY_BASE_DELAY_MS } from '@/shared/config';
import { i18n } from '@/shared/i18n';

import { HistoryList } from './history-list';

const OWNER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const OTHER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const HEAD = 5_000;
const ONE_CMU = 10n ** 18n;
// callRpc waits base, 2×base, … between its retries.
const RETRY_BACKOFF_TOTAL_MS = RPC_RETRY_BASE_DELAY_MS * (2 ** RPC_MAX_RETRIES - 1);

// One stub node: an incoming 1 CMU transfer in the head block, no token logs. No real RPC.
const mockChain = { isDown: false };
jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  createRpcProvider: () => ({
    getBlockNumber: jest.fn(async () => {
      if (mockChain.isDown) throw new Error('node down');
      return 5_000;
    }),
    getBlock: jest.fn(async (n: number) => ({
      timestamp: Math.floor(Date.now() / 1000),
      prefetchedTransactions:
        n === 5_000
          ? [
              {
                hash: '0xincoming',
                from: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
                to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
                value: 10n ** 18n,
                blockNumber: 5_000,
              },
            ]
          : [],
    })),
    getTransactionReceipt: jest.fn(async () => ({ status: 1, blockNumber: 5_000 })),
    getLogs: jest.fn(async () => []),
    destroy: jest.fn(),
  }),
}));

beforeEach(async () => {
  await i18n.changeLanguage('en');
  mockChain.isDown = false;
  useHistoryStore.getState().clear();
  useTxStore.getState().clear();
  useWalletStore.getState().startPinSetup(OWNER, 'private-key');
  useWalletStore.getState().activate();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('HistoryList', () => {
  it('merges a scanned incoming transfer with a local pending send, grouped by day', async () => {
    useTxStore.getState().add({
      hash: '0xsent',
      from: OWNER,
      to: OTHER,
      value: (2n * ONE_CMU).toString(),
      assetKey: 'native',
      nonce: 0,
      fee: { mode: 'legacy', gasLimit: '21000', gasPrice: '1' },
      node: 'http://rpc.test.invalid',
      createdAt: Date.now(),
      status: 'pending',
      confirmations: 0,
      blockNumber: null,
      unknownSince: null,
    });
    await render(<HistoryList />);

    expect(await screen.findByText('+1 CMU')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Loading history…')).toBeNull();
    expect(screen.getByText('-2 CMU')).toBeOnTheScreen();
    expect(screen.getByText('Today')).toBeOnTheScreen();
    expect(screen.getByLabelText('Pending')).toBeOnTheScreen();
    expect(screen.getByLabelText('Confirmed 1/12')).toBeOnTheScreen();
    expect(useHistoryStore.getState().entries[`1912:${OWNER.toLowerCase()}`]?.context.head).toBe(
      HEAD,
    );
  });

  it('shows skeleton rows in the list area while the first page loads', async () => {
    jest.useFakeTimers();
    mockChain.isDown = true;
    await render(<HistoryList />);
    expect(screen.getByLabelText('Loading history…')).toBeOnTheScreen();
    expect(screen.queryByText('No transactions in the last 7 days.')).toBeNull();
    await act(() => jest.advanceTimersByTimeAsync(RETRY_BACKOFF_TOTAL_MS));
    await screen.findByRole('button', { name: 'Try again' });
    expect(screen.queryByLabelText('Loading history…')).toBeNull();
  });

  it('shows an error with a retry when the node cannot be reached', async () => {
    // Fake timers skip callRpc's retry backoff instead of waiting for it in real time.
    jest.useFakeTimers();
    mockChain.isDown = true;
    await render(<HistoryList />);
    await act(() => jest.advanceTimersByTimeAsync(RETRY_BACKOFF_TOTAL_MS));
    expect(
      await screen.findByText("Couldn't load your history from the CointMU network."),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeOnTheScreen();
  });
});
