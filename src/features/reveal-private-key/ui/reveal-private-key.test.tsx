import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { computeAddress } from 'ethers';
import * as ScreenCapture from 'expo-screen-capture';
import * as SecureStore from 'expo-secure-store';
import { AppState, type AppStateStatus } from 'react-native';

import { storeNewPin } from '@/entities/auth';
import { useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { RevealPrivateKey } from './reveal-private-key';

import { seedWallet, seedWalletRecord } from '../../../../jest.seed-wallet';

jest.mock('expo-screen-capture', () => ({ usePreventScreenCapture: jest.fn() }));
// The derivation itself is covered in entities/wallet; here it would only slow the suite down.
jest.mock('@/shared/lib', () => ({
  ...jest.requireActual('@/shared/lib'),
  waitForPaint: jest.fn(async () => undefined),
}));

const PIN = '135790';
// Hardhat's well-known test account 0: never a real wallet.
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const SECRET_KEY = 'muvo.wallet.secret';
let walletId = '';

const secretReads = () =>
  jest.mocked(SecureStore.getItemAsync).mock.calls.filter(([key]) => key.startsWith(SECRET_KEY))
    .length;

async function typePin(pin: string) {
  for (const digit of pin) {
    await fireEvent.press(await screen.findByRole('button', { name: digit }));
  }
}

/** Passes the PIN; the key is then on the screen only as dots. */
async function authenticate() {
  await fireEvent.press(screen.getByRole('button', { name: 'Show private key' }));
  await typePin(PIN);
  return screen.findByRole('button', { name: 'Show key' });
}

async function revealWithPin() {
  await fireEvent.press(await authenticate());
  return screen.getByText(PRIVATE_KEY);
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await storeNewPin(PIN);
  walletId = await seedWallet({
    secret: { kind: 'private-key', privateKey: PRIVATE_KEY },
    address: ADDRESS,
  });
  jest.mocked(SecureStore.getItemAsync).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('RevealPrivateKey', () => {
  it('blocks screenshots for the whole screen', async () => {
    await render(<RevealPrivateKey walletId={walletId} />);
    expect(ScreenCapture.usePreventScreenCapture).toHaveBeenCalled();
  });

  it('asks for the PIN before it reads or shows the key', async () => {
    await render(<RevealPrivateKey walletId={walletId} />);
    expect(screen.getByText('Never share your private key')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Show private key' }));

    expect(await screen.findByText('Enter your PIN')).toBeOnTheScreen();
    expect(screen.queryByText(PRIVATE_KEY)).toBeNull();
    expect(secretReads()).toBe(0);

    await typePin('000000');
    expect(await screen.findByText('Wrong PIN')).toBeOnTheScreen();
    expect(screen.queryByText(PRIVATE_KEY)).toBeNull();
    expect(secretReads()).toBe(0);

    await typePin(PIN);
    expect(await screen.findByRole('button', { name: 'Show key' })).toBeOnTheScreen();
  });

  it('keeps the key out of the screen after the PIN until the eye is pressed', async () => {
    await render(<RevealPrivateKey walletId={walletId} />);
    const eye = await authenticate();
    expect(screen.queryByText(PRIVATE_KEY)).toBeNull();
    // The mask is a fixed run of dots, not one dot per character of the key.
    const mask = screen.getByText(/^•+$/);
    expect(String(mask.props.children)).not.toHaveLength(PRIVATE_KEY.length);
    expect(mask.props.selectable).toBe(false);

    await fireEvent.press(eye);
    expect(screen.getByText(PRIVATE_KEY)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Hide key' }));
    expect(screen.queryByText(PRIVATE_KEY)).toBeNull();
  });

  it('masks the key again 30 seconds after the eye was pressed', async () => {
    await render(<RevealPrivateKey walletId={walletId} />);
    const eye = await authenticate();
    jest.useFakeTimers();
    await fireEvent.press(eye);
    expect(screen.getByText(PRIVATE_KEY)).toBeOnTheScreen();

    await act(() => jest.advanceTimersByTime(29_000));
    expect(screen.getByText(PRIVATE_KEY)).toBeOnTheScreen();
    await act(() => jest.advanceTimersByTime(1_000));
    expect(screen.queryByText(PRIVATE_KEY)).toBeNull();
    expect(screen.getByRole('button', { name: 'Show key' })).toBeOnTheScreen();
  });

  it('offers no way to copy the key', async () => {
    await render(<RevealPrivateKey walletId={walletId} />);
    const key = await revealWithPin();

    expect(key.props.selectable).toBe(false);
    expect(screen.queryByRole('button', { name: /copy/i })).toBeNull();
    expect(screen.getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual([
      'Hide key',
      'Hide',
    ]);
  });

  it('hides the key when Muvo goes to the background', async () => {
    let emit: (state: AppStateStatus) => void = () => undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      emit = handler as typeof emit;
      return { remove: jest.fn() };
    });
    await render(<RevealPrivateKey walletId={walletId} />);
    await revealWithPin();

    await act(() => emit('inactive'));
    expect(screen.queryByText(PRIVATE_KEY)).toBeNull();
    expect(screen.getByRole('button', { name: 'Show private key' })).toBeOnTheScreen();
  });

  it('hides the key on "Hide" and asks for the PIN again next time', async () => {
    await render(<RevealPrivateKey walletId={walletId} />);
    await revealWithPin();

    await fireEvent.press(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.queryByText(PRIVATE_KEY)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Show private key' }));
    expect(await screen.findByText('Enter your PIN')).toBeOnTheScreen();
  });

  describe('one account of a recovery-phrase wallet', () => {
    // Hardhat's public test phrase and its accounts 0 and 1; never real funds.
    const PHRASE = 'test test test test test test test test test test test junk';
    const SECOND_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

    beforeEach(async () => {
      walletId = await seedWallet({
        secret: { kind: 'mnemonic', phrase: PHRASE },
        address: ADDRESS,
      });
      useWalletStore.getState().addAccount(walletId, { index: 1, address: SECOND_ADDRESS });
      jest.mocked(SecureStore.getItemAsync).mockClear();
    });

    it('names the account and its short address on the screen and in the PIN step', async () => {
      await render(<RevealPrivateKey walletId={walletId} index={1} />);
      expect(screen.getByRole('header', { name: 'Account 2 in Wallet 1' })).toBeOnTheScreen();
      expect(screen.getByText('0x7099…79C8')).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Show private key' }));
      expect(
        await screen.findByText('to show the private key of Account 2 in Wallet 1 (0x7099…79C8)'),
      ).toBeOnTheScreen();
    });

    it('shows the key of that account index, and only after the PIN', async () => {
      await render(<RevealPrivateKey walletId={walletId} index={1} />);
      await fireEvent.press(screen.getByRole('button', { name: 'Show private key' }));
      await typePin('000000');
      expect(await screen.findByText('Wrong PIN')).toBeOnTheScreen();
      expect(secretReads()).toBe(0);

      await typePin(PIN);
      await fireEvent.press(await screen.findByRole('button', { name: 'Show key' }));

      // Whatever is on the screen as the key must be the key of account 1's address.
      const shown = screen.getByText(/^0x[0-9a-f]{64}$/).props.children as string;
      expect(computeAddress(shown)).toBe(SECOND_ADDRESS);
      expect(shown).not.toBe(PRIVATE_KEY);
      expect(screen.getByText(SECOND_ADDRESS)).toBeOnTheScreen();
    });

    it('shows nothing for an account index the wallet does not have', async () => {
      await render(<RevealPrivateKey walletId={walletId} index={7} />);
      expect(screen.queryByRole('button', { name: 'Show private key' })).toBeNull();
    });
  });

  it('explains that the key is the only backup of an imported-key wallet', async () => {
    await render(<RevealPrivateKey walletId={walletId} />);
    expect(screen.getByText(/only way to restore it/)).toBeOnTheScreen();
  });

  it('tells a phrase wallet that the key covers that account only', async () => {
    walletId = seedWalletRecord({ source: 'mnemonic', address: ADDRESS });
    await render(<RevealPrivateKey walletId={walletId} />);
    expect(screen.getByText(/key of Account 1 only/)).toBeOnTheScreen();
  });
});
