import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { useHistoryStore, useTxStore } from '@/entities/transaction';
import { useWalletStore } from '@/entities/wallet';
import { RPC_MAX_RETRIES, RPC_RETRY_BASE_DELAY_MS } from '@/shared/config';
import { i18n } from '@/shared/i18n';

import { HistoryList } from './history-list';

import { addWalletRecord, seedWalletRecord } from '../../../../jest.seed-wallet';

const OWNER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const OTHER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const SECOND = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
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
              {
                hash: '0xsecond',
                from: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
                to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
                value: 3n * 10n ** 18n,
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
  seedWalletRecord({ source: 'private-key', address: OWNER });
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
    await render(<HistoryList filter={null} onFilterChange={jest.fn()} />);

    expect(await screen.findByText('+1 CMU')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Loading history…')).toBeNull();
    expect(screen.getByText('-2 CMU')).toBeOnTheScreen();
    expect(screen.getByText('Today')).toBeOnTheScreen();
    expect(screen.getByLabelText('Pending')).toBeOnTheScreen();
    expect(screen.getByLabelText('Confirmed 1/12')).toBeOnTheScreen();
    expect(useHistoryStore.getState().session?.head).toBe(HEAD);
    // Not one of the user's addresses: the other transfer in that block stays out.
    expect(screen.queryByText('+3 CMU')).toBeNull();
    // One account: nothing to filter by.
    expect(screen.queryByRole('radio', { name: 'All' })).toBeNull();
  });

  it('shows every account by default, names the account on each row, and filters by chip', async () => {
    addWalletRecord({ source: 'private-key', address: SECOND });
    const onFilterChange = jest.fn();
    const view = await render(<HistoryList filter={null} onFilterChange={onFilterChange} />);

    expect(await screen.findByText('+1 CMU')).toBeOnTheScreen();
    expect(screen.getByText('+3 CMU')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: /^Account 1: Received \+1 CMU, 0x7099…79C8/ }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'All' })).toBeChecked();
    // Two wallets, each with its "Account 1": the second chip is the second wallet's.
    const chips = screen.getAllByRole('radio', { name: 'Account 1' });
    expect(chips).toHaveLength(2);

    await fireEvent.press(chips[1]);
    expect(onFilterChange).toHaveBeenCalledWith(SECOND);

    await view.rerender(<HistoryList filter={SECOND} onFilterChange={onFilterChange} />);
    expect(screen.getByText('+3 CMU')).toBeOnTheScreen();
    expect(screen.queryByText('+1 CMU')).toBeNull();
    expect(screen.getAllByRole('radio', { name: 'Account 1' })[1]).toBeChecked();
    expect(screen.getByRole('radio', { name: 'All' })).not.toBeChecked();
  });

  it('shows skeleton rows in the list area while the first page loads', async () => {
    jest.useFakeTimers();
    mockChain.isDown = true;
    await render(<HistoryList filter={null} onFilterChange={jest.fn()} />);
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
    await render(<HistoryList filter={null} onFilterChange={jest.fn()} />);
    await act(() => jest.advanceTimersByTimeAsync(RETRY_BACKOFF_TOTAL_MS));
    expect(
      await screen.findByText("Couldn't load your history from the CointMU network."),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeOnTheScreen();
  });
});
