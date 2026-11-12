import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as ScreenCapture from 'expo-screen-capture';
import * as SecureStore from 'expo-secure-store';
import { AppState, type AppStateStatus } from 'react-native';

import { storeNewPin } from '@/entities/auth';
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
  await seedWallet({ secret: { kind: 'private-key', privateKey: PRIVATE_KEY }, address: ADDRESS });
  jest.mocked(SecureStore.getItemAsync).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('RevealPrivateKey', () => {
  it('blocks screenshots for the whole screen', async () => {
    await render(<RevealPrivateKey />);
    expect(ScreenCapture.usePreventScreenCapture).toHaveBeenCalled();
  });

  it('asks for the PIN before it reads or shows the key', async () => {
    await render(<RevealPrivateKey />);
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
    await render(<RevealPrivateKey />);
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
    await render(<RevealPrivateKey />);
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
    await render(<RevealPrivateKey />);
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
    await render(<RevealPrivateKey />);
    await revealWithPin();

    await act(() => emit('inactive'));
    expect(screen.queryByText(PRIVATE_KEY)).toBeNull();
    expect(screen.getByRole('button', { name: 'Show private key' })).toBeOnTheScreen();
  });

  it('hides the key on "Hide" and asks for the PIN again next time', async () => {
    await render(<RevealPrivateKey />);
    await revealWithPin();

    await fireEvent.press(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.queryByText(PRIVATE_KEY)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Show private key' }));
    expect(await screen.findByText('Enter your PIN')).toBeOnTheScreen();
  });

  it('explains that the key is the only backup of an imported-key wallet', async () => {
    await render(<RevealPrivateKey />);
    expect(screen.getByText(/only way to restore it/)).toBeOnTheScreen();
  });

  it('tells a phrase wallet that the key covers the active account only', async () => {
    seedWalletRecord({ source: 'mnemonic', address: ADDRESS });
    await render(<RevealPrivateKey />);
    expect(screen.getByText(/key of Account 1 only/)).toBeOnTheScreen();
  });
});
