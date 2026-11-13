import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';

import { storeNewPin, useSessionStore } from '@/entities/auth';
import { readWalletSecret, useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';
import { DEFAULT_APPEARANCE, useAppearanceStore } from '@/shared/model';

import { preloadRoutes } from '../../../../jest.preload-routes';
import { addWallet, seedWallet } from '../../../../jest.seed-wallet';

preloadRoutes();

jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  createRpcProvider: () => ({
    getBalance: jest.fn(async () => 0n),
    send: jest.fn(async () => '0x778'),
    destroy: jest.fn(),
  }),
}));
// The derivation itself is covered in entities/wallet; here it would only slow the suite down.
jest.mock('@/shared/lib', () => ({
  ...jest.requireActual('@/shared/lib'),
  waitForPaint: jest.fn(async () => undefined),
}));

const PIN = '135790';
// The public BIP-39 "abandon" test phrase and public Hardhat test accounts; never real funds.
const PHRASE =
  'abandon ability able about above absent absorb abstract absurd abuse access accident';
const PHRASE_ADDRESS = '0x0000000000000000000000000000000000000001';
const KEY = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';
const KEY_ADDRESS = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
const TIMEOUT = { timeout: 5_000 };

const state = () => useWalletStore.getState();
let phraseWalletId = '';

/** Wallet 2: a private-key wallet. Imported second, so it is the account in use. */
const addKeyWallet = () =>
  addWallet({ secret: { kind: 'private-key', privateKey: KEY }, address: KEY_ADDRESS });

async function press(name: string | RegExp) {
  await fireEvent.press(await screen.findByRole('button', { name }, TIMEOUT));
}

async function typePin() {
  for (const digit of PIN) await press(digit);
}

beforeEach(async () => {
  // renderRouter switches to fake timers; the PIN hash below waits for a real frame.
  jest.useRealTimers();
  await i18n.changeLanguage('en');
  await AsyncStorage.setItem('muvo.installed', '1');
  await storeNewPin(PIN);
  phraseWalletId = await seedWallet({
    secret: { kind: 'mnemonic', phrase: PHRASE },
    address: PHRASE_ADDRESS,
  });
  state().activate();
  useWalletStore.setState({ hasHydrated: true });
  useSessionStore.getState().unlock();
  useAppearanceStore.setState({ ...DEFAULT_APPEARANCE, hasHydrated: true });
});

afterEach(() => jest.restoreAllMocks());

describe('one-wallet actions opened from Settings', () => {
  describe('with one wallet', () => {
    it('goes straight to the recovery phrase and names the wallet', async () => {
      await renderRouter('./app', { initialUrl: '/recovery-phrase' });
      expect(
        await screen.findByRole('header', { name: 'Recovery phrase of Wallet 1' }, TIMEOUT),
      ).toBeOnTheScreen();
      expect(screen.getByText('0x0000…0001')).toBeOnTheScreen();
      expect(screen.queryByTestId('wallet-picker')).toBeNull();
    });

    it('goes straight to the private key and to remove wallet, naming the wallet', async () => {
      const key = await renderRouter('./app', { initialUrl: '/private-key' });
      expect(
        await screen.findByRole('header', { name: 'Account 1 in Wallet 1' }, TIMEOUT),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId('wallet-picker')).toBeNull();
      await key.unmount();

      await renderRouter('./app', { initialUrl: '/remove-wallet' });
      expect(
        await screen.findByRole('header', { name: 'Remove Wallet 1' }, TIMEOUT),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId('wallet-picker')).toBeNull();
    });
  });

  describe('with several wallets', () => {
    beforeEach(async () => {
      await addKeyWallet();
    });

    it('asks which wallet first: name, kind and number of accounts', async () => {
      await renderRouter('./app', { initialUrl: '/recovery-phrase' });
      expect(
        await screen.findByRole('header', { name: "Which wallet's recovery phrase?" }, TIMEOUT),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Wallet 1' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Wallet 2' })).toBeOnTheScreen();
      expect(screen.getByText('Recovery phrase, 1 account')).toBeOnTheScreen();
      expect(screen.getByText('Private key, 1 account')).toBeOnTheScreen();
      // Nothing about a wallet is shown before one is picked.
      expect(screen.queryByRole('button', { name: 'Reveal recovery phrase' })).toBeNull();
    });

    it('reveals the phrase of the picked wallet, not of the account in use', async () => {
      // Wallet 2 (a private key, no phrase) is in use and the default is wallet 1's account.
      expect(state().address).toBe(KEY_ADDRESS);
      await renderRouter('./app', { initialUrl: '/recovery-phrase' });
      await press('Wallet 1');

      expect(
        await screen.findByRole('header', { name: 'Recovery phrase of Wallet 1' }),
      ).toBeOnTheScreen();
      await press('Reveal recovery phrase');
      // The auth step says whose phrase the PIN is for.
      expect(
        await screen.findByText('to show the recovery phrase of Wallet 1 (0x0000…0001)'),
      ).toBeOnTheScreen();
      await typePin();
      await press('Show words');
      expect(await screen.findByText('abandon')).toBeOnTheScreen();
      expect(screen.getByRole('header', { name: 'Recovery phrase of Wallet 1' })).toBeOnTheScreen();
    });

    it('shows the private key of the picked wallet, not of the default account', async () => {
      state().selectAccount(phraseWalletId, 0);
      await renderRouter('./app', { initialUrl: '/private-key' });
      expect(
        await screen.findByRole('header', { name: "Which wallet's private key?" }, TIMEOUT),
      ).toBeOnTheScreen();
      await press('Wallet 2');

      expect(
        await screen.findByRole('header', { name: 'Account 1 in Wallet 2' }),
      ).toBeOnTheScreen();
      await press('Show private key');
      expect(
        await screen.findByText('to show the private key of Account 1 in Wallet 2 (0x3C44…93BC)'),
      ).toBeOnTheScreen();
      await typePin();
      await press('Show key');
      expect(await screen.findByText(KEY)).toBeOnTheScreen();
      expect(screen.getByText(KEY_ADDRESS)).toBeOnTheScreen();
    });

    it('removes the picked wallet only, and both confirmations name it', async () => {
      const alert = jest.spyOn(Alert, 'alert');
      await renderRouter('./app', { initialUrl: '/remove-wallet' });
      expect(
        await screen.findByRole('header', { name: 'Which wallet do you want to remove?' }, TIMEOUT),
      ).toBeOnTheScreen();
      await press('Wallet 2');

      // First confirmation: the wallet by name and address, with the acknowledgement.
      expect(await screen.findByRole('header', { name: 'Remove Wallet 2' })).toBeOnTheScreen();
      expect(screen.getByText('0x3C44…93BC')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('checkbox'));
      await press('Remove wallet');
      expect(
        await screen.findByText('to remove Wallet 2 (0x3C44…93BC) from this phone'),
      ).toBeOnTheScreen();
      await typePin();

      // Final confirmation.
      await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
      const [title, body, buttons] = alert.mock.calls[0] ?? [];
      expect(title).toBe('Remove Wallet 2 now?');
      expect(body).toBe(
        "Wallet 2 (0x3C44…93BC) will be removed from this phone. This can't be undone.",
      );
      expect(state().wallets).toHaveLength(2);
      (buttons as AlertButton[]).find((button) => button.style === 'destructive')?.onPress?.();

      await waitFor(() => expect(state().wallets).toHaveLength(1));
      expect(state().wallets[0]?.id).toBe(phraseWalletId);
      await expect(readWalletSecret(phraseWalletId)).resolves.not.toBeNull();
    });

    it('opens the key of the card whose menu it came from: no picker, PIN first', async () => {
      const keyWalletId = state().wallets[1]?.id ?? '';
      // The other wallet is in use, so nothing but the route can name this one.
      state().selectAccount(phraseWalletId, 0);
      const app = await renderRouter('./app', {
        initialUrl: `/account-menu?walletId=${keyWalletId}&index=0`,
      });
      await press('Show private key');

      await waitFor(() => expect(app.getPathname()).toBe('/private-key'));
      expect(
        await screen.findByRole('header', { name: 'Account 1 in Wallet 2' }, TIMEOUT),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId('wallet-picker')).toBeNull();
      expect(screen.queryByText(KEY)).toBeNull();

      await press('Show private key');
      expect(
        await screen.findByText('to show the private key of Account 1 in Wallet 2 (0x3C44…93BC)'),
      ).toBeOnTheScreen();
      await typePin();
      // Masked until the eye; for a private-key wallet it is the wallet's own key.
      expect(screen.queryByText(KEY)).toBeNull();
      await press('Show key');
      expect(await screen.findByText(KEY)).toBeOnTheScreen();
    });

    it('skips the picker when the route names the wallet (its own page, a card menu)', async () => {
      await renderRouter('./app', {
        initialUrl: `/remove-wallet?walletId=${phraseWalletId}`,
      });
      expect(
        await screen.findByRole('header', { name: 'Remove Wallet 1' }, TIMEOUT),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId('wallet-picker')).toBeNull();
    });
  });
});
