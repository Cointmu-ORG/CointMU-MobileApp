import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from 'ethers';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as SecureStore from 'expo-secure-store';

import { storeNewPin, useSessionStore } from '@/entities/auth';
import { useTxStore } from '@/entities/transaction';
import { useSendFlowStore } from '../model/send-flow-store';
import { sendTransaction } from '../model/send-transaction';
import { useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { preloadRoutes } from '../../../../jest.preload-routes';

import { addWallet, seedWallet } from '../../../../jest.seed-wallet';

preloadRoutes();

// Public Hardhat test accounts; never hold real funds.
const KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const FROM = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const TO = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
// A second wallet next to the sending one: its key must never sign for FROM.
const OTHER_KEY = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';
const OTHER = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
let otherWalletId = '';
let walletId = '';
const PIN = ['1', '3', '5', '7', '9', '0'];
const WRONG_PIN = ['0', '0', '0', '0', '0', '0'];
const SECRET_KEY = 'muvo.wallet.secret';
const ONE_AND_A_HALF_CMU = 15n * 10n ** 17n;
const NONCE = 3;
const CHAIN_ID = 1912n;

// No test hits a real RPC: one stub node on chain 1912 (0x778) with EIP-1559 fees.
const mockBroadcast = jest.fn(async (signed: string) => ({ hash: signed }));
jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  createRpcProvider: () => ({
    send: jest.fn(async () => '0x778'),
    getBalance: jest.fn(async () => 10n * 10n ** 18n),
    getCode: jest.fn(async () => '0x'),
    estimateGas: jest.fn(async () => 21_000n),
    getFeeData: jest.fn(async () => ({
      gasPrice: null,
      maxFeePerGas: 2_000_000_000n,
      maxPriorityFeePerGas: 1_000_000_000n,
    })),
    getTransactionCount: jest.fn(async () => 3),
    broadcastTransaction: (signed: string) => mockBroadcast(signed),
    destroy: jest.fn(),
  }),
}));

async function press(name: string) {
  await fireEvent.press(await screen.findByRole('button', { name }));
}

async function enterPin(digits: readonly string[]) {
  for (const digit of digits) await press(digit);
}

async function fillFormAndReview() {
  await renderRouter('./app', { initialUrl: '/send' });
  await fireEvent.changeText(await screen.findByLabelText('Recipient address'), TO.toLowerCase());
  await fireEvent.changeText(screen.getByLabelText('Amount (CMU)'), '1.5');
  await press('Review');
  expect(await screen.findByRole('button', { name: 'Confirm and send' })).toBeOnTheScreen();
}

function secretReads() {
  return jest
    .mocked(SecureStore.getItemAsync)
    .mock.calls.filter(([key]) => key.startsWith(SECRET_KEY));
}

beforeEach(async () => {
  // renderRouter switches to fake timers; the PIN hash below waits for a real frame.
  jest.useRealTimers();
  mockBroadcast.mockClear();
  await i18n.changeLanguage('en');
  await AsyncStorage.setItem('muvo.installed', '1');
  await storeNewPin(PIN.join(''));
  otherWalletId = await seedWallet({
    secret: { kind: 'private-key', privateKey: OTHER_KEY },
    address: OTHER,
  });
  useWalletStore.getState().activate();
  // Imported second, so it is the active wallet: FROM is the sending account.
  walletId = await addWallet({ secret: { kind: 'private-key', privateKey: KEY }, address: FROM });
  useWalletStore.setState({ hasHydrated: true });
  useSessionStore.getState().unlock();
  useTxStore.getState().clear();
});

describe('send flow', () => {
  it('goes form → review → PIN → result and saves the pending record first', async () => {
    await fillFormAndReview();
    expect(screen.getByText(TO)).toBeOnTheScreen();
    await press('Confirm and send');
    expect(await screen.findByText('Confirm with your PIN')).toBeOnTheScreen();
    await enterPin(PIN);

    expect(await screen.findByRole('header', { name: 'Sent to the network' })).toBeOnTheScreen();
    expect(mockBroadcast).toHaveBeenCalledTimes(1);
    const tx = Transaction.from(mockBroadcast.mock.calls[0]?.[0] ?? '');
    expect(tx).toMatchObject({ chainId: CHAIN_ID, type: 2, to: TO, value: ONE_AND_A_HALF_CMU });
    expect(tx.from).toBe(FROM);
    expect(useTxStore.getState().records[0]).toMatchObject({
      hash: tx.hash,
      status: 'pending',
      nonce: NONCE,
      value: ONE_AND_A_HALF_CMU.toString(),
      fee: { mode: 'eip1559', gasLimit: '21000' },
    });
  });

  it('shows success only once the transaction is confirmed, then final', async () => {
    await fillFormAndReview();
    await press('Confirm and send');
    await enterPin(PIN);

    expect(await screen.findByRole('header', { name: 'Sent to the network' })).toBeOnTheScreen();
    expect(screen.queryByTestId('send-success-mark')).toBeNull();
    const hash = useTxStore.getState().records[0]?.hash ?? '';

    // What the status poller writes when the receipt arrives.
    await act(() =>
      useTxStore.getState().update(hash, {
        status: 'confirmed',
        confirmations: 3,
        blockNumber: 10,
        unknownSince: null,
      }),
    );
    expect(await screen.findByRole('header', { name: 'Confirmed' })).toBeOnTheScreen();
    expect(screen.getByTestId('send-success-mark')).toBeOnTheScreen();
    expect(screen.getByText('3/12')).toBeOnTheScreen();

    await act(() =>
      useTxStore
        .getState()
        .update(hash, { status: 'final', confirmations: 12, blockNumber: 10, unknownSince: null }),
    );
    expect(await screen.findByRole('header', { name: 'Final' })).toBeOnTheScreen();
    expect(screen.getByText('12/12')).toBeOnTheScreen();
  });

  it('signs with the secret of the wallet that holds the sending account', async () => {
    await fillFormAndReview();
    jest.mocked(SecureStore.getItemAsync).mockClear();
    await press('Confirm and send');
    await enterPin(PIN);
    expect(await screen.findByRole('header', { name: 'Sent to the network' })).toBeOnTheScreen();

    const read = secretReads().map(([key]) => key);
    expect(read).toEqual([`${SECRET_KEY}.${walletId}`]);
    expect(Transaction.from(mockBroadcast.mock.calls[0]?.[0] ?? '').from).toBe(FROM);
  });

  it('sends from the other wallet with its own key after switching to it', async () => {
    useWalletStore.getState().selectAccount(otherWalletId, 0);
    await fillFormAndReview();
    jest.mocked(SecureStore.getItemAsync).mockClear();
    await press('Confirm and send');
    await enterPin(PIN);
    expect(await screen.findByRole('header', { name: 'Sent to the network' })).toBeOnTheScreen();

    expect(secretReads().map(([key]) => key)).toEqual([`${SECRET_KEY}.${otherWalletId}`]);
    expect(Transaction.from(mockBroadcast.mock.calls[0]?.[0] ?? '').from).toBe(OTHER);
  });

  describe('the source account', () => {
    const fromField = (name: RegExp) => screen.findByRole('button', { name });

    it('starts on the account in use and shows its balance', async () => {
      await renderRouter('./app', { initialUrl: '/send' });
      expect(await fromField(/^From Account 1, 10 CMU$/)).toBeOnTheScreen();
      expect(screen.getByText('0xf39F…2266')).toBeOnTheScreen();
    });

    it("signs from the account picked in From, with that wallet's key", async () => {
      const app = await renderRouter('./app', { initialUrl: '/send' });
      await fireEvent.press(await fromField(/^From Account 1/));
      // The picker: both wallets, the one in use on top.
      expect(await screen.findByRole('header', { name: 'Send from' })).toBeOnTheScreen();
      await fireEvent.press(screen.getAllByRole('radio', { checked: false })[0]);
      await act(async () => jest.runOnlyPendingTimers());
      expect(app.getPathname()).toBe('/send');
      expect(await screen.findByText('0x3C44…93BC')).toBeOnTheScreen();

      await fireEvent.changeText(screen.getByLabelText('Recipient address'), TO.toLowerCase());
      await fireEvent.changeText(screen.getByLabelText('Amount (CMU)'), '1.5');
      await press('Review');
      await screen.findByRole('button', { name: 'Confirm and send' });
      // The review names the picked account in full.
      expect(screen.getByText(OTHER)).toBeOnTheScreen();
      expect(screen.queryByText(FROM)).toBeNull();

      jest.mocked(SecureStore.getItemAsync).mockClear();
      await press('Confirm and send');
      await enterPin(PIN);
      expect(await screen.findByRole('header', { name: 'Sent to the network' })).toBeOnTheScreen();

      expect(secretReads().map(([key]) => key)).toEqual([`${SECRET_KEY}.${otherWalletId}`]);
      expect(Transaction.from(mockBroadcast.mock.calls[0]?.[0] ?? '').from).toBe(OTHER);
      expect(useTxStore.getState().records[0]?.from).toBe(OTHER);
    });

    it('clears what was checked against the old account when the source changes', async () => {
      await renderRouter('./app', { initialUrl: '/send' });
      await fireEvent.changeText(await screen.findByLabelText('Amount (CMU)'), '0');
      await press('Review');
      expect(await screen.findByText('Enter an amount above zero.')).toBeOnTheScreen();

      await act(async () => useWalletStore.getState().selectAccount(otherWalletId, 0));
      expect(screen.queryByText('Enter an amount above zero.')).toBeNull();
      expect(await fromField(/^From Account 1/)).toBeOnTheScreen();
      expect(screen.getByText('0x3C44…93BC')).toBeOnTheScreen();
    });

    it('blocks the review when the account in use is no longer the one in From', async () => {
      await fillFormAndReview();
      await act(async () => useWalletStore.getState().selectAccount(otherWalletId, 0));

      // The review still shows the account the draft was made for, and cannot be confirmed
      // against another account's balance.
      expect(screen.getByText(FROM)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Confirm and send' })).toBeDisabled();
      expect(mockBroadcast).not.toHaveBeenCalled();
    });

    it('signs for the account in the draft, whatever the account in use is', async () => {
      await fillFormAndReview();
      const draft = useSendFlowStore.getState().draft;
      if (draft === null) throw new Error('expected a draft');
      expect(draft.from).toEqual({ walletId, index: 0, address: FROM });
      await act(async () => useWalletStore.getState().selectAccount(otherWalletId, 0));
      jest.mocked(SecureStore.getItemAsync).mockClear();

      const outcome = await sendTransaction({ draft, onStage: jest.fn() });

      expect(outcome).toMatchObject({ ok: true });
      expect(secretReads().map(([key]) => key)).toEqual([`${SECRET_KEY}.${walletId}`]);
      expect(Transaction.from(mockBroadcast.mock.calls[0]?.[0] ?? '').from).toBe(FROM);
    });

    it('refuses to sign when the draft names a wallet whose key is another address', async () => {
      await fillFormAndReview();
      const draft = useSendFlowStore.getState().draft;
      if (draft === null) throw new Error('expected a draft');

      const outcome = await sendTransaction({
        draft: { ...draft, from: { ...draft.from, walletId: otherWalletId } },
        onStage: jest.fn(),
      });

      expect(outcome.ok).toBe(false);
      expect(mockBroadcast).not.toHaveBeenCalled();
    });
  });

  it('never reads the key or broadcasts before the PIN is verified', async () => {
    await fillFormAndReview();
    // Bootstrap's integrity check read the secret once; only reads from here on count.
    jest.mocked(SecureStore.getItemAsync).mockClear();

    await press('Confirm and send');
    expect(await screen.findByText('Confirm with your PIN')).toBeOnTheScreen();
    expect(secretReads()).toHaveLength(0);

    await enterPin(WRONG_PIN);
    expect(await screen.findByText('Wrong PIN')).toBeOnTheScreen();
    expect(secretReads()).toHaveLength(0);
    expect(mockBroadcast).not.toHaveBeenCalled();
    expect(useTxStore.getState().records).toHaveLength(0);
  });

  it('refuses a bad checksum and a zero amount before quoting', async () => {
    await renderRouter('./app', { initialUrl: '/send' });
    await fireEvent.changeText(
      await screen.findByLabelText('Recipient address'),
      TO.replace('C51', 'c51'),
    );
    await fireEvent.changeText(screen.getByLabelText('Amount (CMU)'), '0');
    await press('Review');
    expect(await screen.findByText(/has a typo/)).toBeOnTheScreen();
    expect(screen.getByText('Enter an amount above zero.')).toBeOnTheScreen();
  });
});
