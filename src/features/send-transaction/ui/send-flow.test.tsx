import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from 'ethers';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as SecureStore from 'expo-secure-store';

import { storeNewPin, useSessionStore } from '@/entities/auth';
import { useTxStore } from '@/entities/transaction';
import { saveWalletSecret, useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { preloadRoutes } from '../../../../jest.preload-routes';

preloadRoutes();

// Public Hardhat test accounts; never hold real funds.
const KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const FROM = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const TO = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
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
  return jest.mocked(SecureStore.getItemAsync).mock.calls.filter(([key]) => key === SECRET_KEY);
}

beforeEach(async () => {
  // renderRouter switches to fake timers; the PIN hash below waits for a real frame.
  jest.useRealTimers();
  mockBroadcast.mockClear();
  await i18n.changeLanguage('en');
  await AsyncStorage.setItem('muvo.installed', '1');
  await saveWalletSecret({ kind: 'private-key', privateKey: KEY });
  await storeNewPin(PIN.join(''));
  useWalletStore.getState().startPinSetup(FROM, 'private-key');
  useWalletStore.getState().activate();
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

    expect(await screen.findByText('Sent')).toBeOnTheScreen();
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
