import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as ScreenCapture from 'expo-screen-capture';
import * as SecureStore from 'expo-secure-store';
import { AppState, type AppStateStatus } from 'react-native';

import { storeNewPin } from '@/entities/auth';
import { saveWalletSecret, useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { RevealPrivateKey } from './reveal-private-key';

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
  jest.mocked(SecureStore.getItemAsync).mock.calls.filter(([key]) => key === SECRET_KEY).length;

async function typePin(pin: string) {
  for (const digit of pin) {
    await fireEvent.press(await screen.findByRole('button', { name: digit }));
  }
}

async function revealWithPin() {
  await fireEvent.press(screen.getByRole('button', { name: 'Show private key' }));
  await typePin(PIN);
  return screen.findByText(PRIVATE_KEY);
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await saveWalletSecret({ kind: 'private-key', privateKey: PRIVATE_KEY });
  await storeNewPin(PIN);
  useWalletStore.getState().startPinSetup(ADDRESS, 'private-key');
  jest.mocked(SecureStore.getItemAsync).mockClear();
});

afterEach(() => jest.restoreAllMocks());

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
    expect(await screen.findByText(PRIVATE_KEY)).toBeOnTheScreen();
  });

  it('offers no way to copy the key', async () => {
    await render(<RevealPrivateKey />);
    const key = await revealWithPin();

    expect(key.props.selectable).toBe(false);
    expect(screen.queryByRole('button', { name: /copy/i })).toBeNull();
    expect(screen.getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual([
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
    useWalletStore.getState().startPinSetup(ADDRESS, 'mnemonic');
    await render(<RevealPrivateKey />);
    expect(screen.getByText(/key of Account 1 only/)).toBeOnTheScreen();
  });
});
