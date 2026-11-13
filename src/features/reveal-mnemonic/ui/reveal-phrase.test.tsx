import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { AppState, type AppStateStatus } from 'react-native';

import { storeNewPin } from '@/entities/auth';
import { i18n } from '@/shared/i18n';

import { RevealPhrase } from './reveal-phrase';

import { seedWallet, seedWalletRecord } from '../../../../jest.seed-wallet';

const PIN = '135790';
const PHRASE =
  'abandon ability able about above absent absorb abstract absurd abuse access accident';
const ADDRESS = '0x0000000000000000000000000000000000000001';
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

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await storeNewPin(PIN);
  walletId = await seedWallet({ secret: { kind: 'mnemonic', phrase: PHRASE }, address: ADDRESS });
  jest.mocked(SecureStore.getItemAsync).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/** Passes the PIN; the words are then on the screen only as dots. */
async function authenticate() {
  await fireEvent.press(screen.getByRole('button', { name: 'Reveal recovery phrase' }));
  await typePin(PIN);
  return screen.findByRole('button', { name: 'Show words' });
}

describe('RevealPhrase', () => {
  it('asks for the PIN before it reads or shows the phrase', async () => {
    await render(<RevealPhrase walletId={walletId} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Reveal recovery phrase' }));

    expect(await screen.findByText('Enter your PIN')).toBeOnTheScreen();
    expect(screen.queryByText('abandon')).toBeNull();
    expect(secretReads()).toBe(0);

    await typePin('000000');
    expect(await screen.findByText('Wrong PIN')).toBeOnTheScreen();
    expect(secretReads()).toBe(0);

    await typePin(PIN);
    expect(await screen.findByRole('button', { name: 'Show words' })).toBeOnTheScreen();
  });

  it('keeps the words out of the screen after the PIN until the eye is pressed', async () => {
    await render(<RevealPhrase walletId={walletId} />);
    const eye = await authenticate();
    for (const word of PHRASE.split(' ')) expect(screen.queryByText(word)).toBeNull();

    await fireEvent.press(eye);
    expect(screen.getByText('abandon')).toBeOnTheScreen();
    expect(screen.getByText('accident')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Hide words' }));
    expect(screen.queryByText('abandon')).toBeNull();
    expect(screen.getByRole('button', { name: 'Show words' })).toBeOnTheScreen();
  });

  it('masks the words again 30 seconds after the eye was pressed', async () => {
    await render(<RevealPhrase walletId={walletId} />);
    const eye = await authenticate();
    jest.useFakeTimers();
    await fireEvent.press(eye);
    expect(screen.getByText('abandon')).toBeOnTheScreen();

    await act(() => jest.advanceTimersByTime(29_000));
    expect(screen.getByText('abandon')).toBeOnTheScreen();
    await act(() => jest.advanceTimersByTime(1_000));
    expect(screen.queryByText('abandon')).toBeNull();
  });

  it('hides the words when Muvo goes to the background', async () => {
    let emit: (state: AppStateStatus) => void = () => undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      emit = handler as typeof emit;
      return { remove: jest.fn() };
    });
    await render(<RevealPhrase walletId={walletId} />);
    await fireEvent.press(await authenticate());
    expect(screen.getByText('abandon')).toBeOnTheScreen();

    await act(() => emit('background'));
    expect(screen.queryByText('abandon')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reveal recovery phrase' })).toBeOnTheScreen();
  });

  it('never offers a phrase for a private-key wallet', async () => {
    walletId = seedWalletRecord({ source: 'private-key', address: ADDRESS });
    await render(<RevealPhrase walletId={walletId} />);
    expect(screen.getByText(/has no recovery phrase/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Reveal recovery phrase' })).toBeNull();
  });
});
