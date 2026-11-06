import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { AppState, type AppStateStatus } from 'react-native';

import { storeNewPin } from '@/entities/auth';
import { saveWalletSecret, useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { RevealPhrase } from './reveal-phrase';

const PIN = '135790';
const PHRASE =
  'abandon ability able about above absent absorb abstract absurd abuse access accident';
const ADDRESS = '0x0000000000000000000000000000000000000001';
const SECRET_KEY = 'muvo.wallet.secret';

const secretReads = () =>
  jest.mocked(SecureStore.getItemAsync).mock.calls.filter(([key]) => key === SECRET_KEY).length;

async function typePin(pin: string) {
  for (const digit of pin) {
    await fireEvent.press(await screen.findByRole('button', { name: digit }));
  }
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await saveWalletSecret({ kind: 'mnemonic', phrase: PHRASE });
  await storeNewPin(PIN);
  useWalletStore.getState().startPinSetup(ADDRESS, 'mnemonic');
  jest.mocked(SecureStore.getItemAsync).mockClear();
});

afterEach(() => jest.restoreAllMocks());

describe('RevealPhrase', () => {
  it('asks for the PIN before it reads or shows the phrase', async () => {
    await render(<RevealPhrase />);
    await fireEvent.press(screen.getByRole('button', { name: 'Reveal recovery phrase' }));

    expect(await screen.findByText('Enter your PIN')).toBeOnTheScreen();
    expect(screen.queryByText('abandon')).toBeNull();
    expect(secretReads()).toBe(0);

    await typePin('000000');
    expect(await screen.findByText('Wrong PIN')).toBeOnTheScreen();
    expect(secretReads()).toBe(0);

    await typePin(PIN);
    expect(await screen.findByText('abandon')).toBeOnTheScreen();
    expect(screen.getByText('accident')).toBeOnTheScreen();
  });

  it('hides the words when Muvo goes to the background', async () => {
    let emit: (state: AppStateStatus) => void = () => undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      emit = handler as typeof emit;
      return { remove: jest.fn() };
    });
    await render(<RevealPhrase />);
    await fireEvent.press(screen.getByRole('button', { name: 'Reveal recovery phrase' }));
    await typePin(PIN);
    expect(await screen.findByText('abandon')).toBeOnTheScreen();

    await act(() => emit('background'));
    expect(screen.queryByText('abandon')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reveal recovery phrase' })).toBeOnTheScreen();
  });

  it('never offers a phrase for a private-key wallet', async () => {
    useWalletStore.getState().startPinSetup(ADDRESS, 'private-key');
    await render(<RevealPhrase />);
    expect(screen.getByText(/has no recovery phrase/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Reveal recovery phrase' })).toBeNull();
  });
});
