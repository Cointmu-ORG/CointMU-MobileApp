import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { storeNewPin, useSessionStore } from '@/entities/auth';
import { useWalletStore } from '@/entities/wallet';
import { ROUTES } from '@/shared/config';
import { i18n } from '@/shared/i18n';
import { DEFAULT_APPEARANCE, useAppearanceStore } from '@/shared/model';

import { preloadRoutes } from '../../../../jest.preload-routes';
import { seedWallet } from '../../../../jest.seed-wallet';

jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  createRpcProvider: () => ({
    getBalance: jest.fn(async () => 0n),
    send: jest.fn(async () => '0x778'),
    destroy: jest.fn(),
  }),
}));

preloadRoutes();

const PHRASE = 'test test test test test test test test test test test junk';
const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

beforeEach(async () => {
  // renderRouter switches to fake timers; the PIN hash below waits for a real frame.
  jest.useRealTimers();
  await i18n.changeLanguage('en');
  await AsyncStorage.setItem('muvo.installed', '1');
  await storeNewPin('135790');
  await seedWallet({ secret: { kind: 'mnemonic', phrase: PHRASE }, address: ADDRESS });
  useWalletStore.getState().activate();
  useWalletStore.setState({ hasHydrated: true });
  useSessionStore.getState().unlock();
  useAppearanceStore.setState({ ...DEFAULT_APPEARANCE, hasHydrated: true });
});

describe('Wallets tab', () => {
  // A card tapped while a sheet is still opening used to push a second (tabs) screen above it.
  it('opens Home on the existing tabs screen when a card is tapped under an open sheet', async () => {
    const app = await renderRouter('./app', { initialUrl: ROUTES.wallets });
    const rootStackRoutes = () =>
      (app.getRouterState()?.routes[0]?.state?.routes ?? []).map((route) => route.name);
    const card = await screen.findByRole('button', { name: /^Account 1/ }, { timeout: 5_000 });
    await act(async () => router.push(ROUTES.walletAdd));
    expect(rootStackRoutes()).toEqual(['(tabs)', 'wallet-add']);

    await fireEvent.press(card);
    await act(async () => jest.runOnlyPendingTimers());

    expect(rootStackRoutes()).toEqual(['(tabs)']);
    expect(app.getPathname()).toBe(ROUTES.home);
  });

  describe('card icons', () => {
    const STORAGE_KEY = 'muvo.wallet';
    const CARD_TIMEOUT = { timeout: 5_000 };
    const findCard = () => screen.findByRole('button', { name: /^Account 1/ }, CARD_TIMEOUT);
    const storedWallet = async () => (await AsyncStorage.getItem(STORAGE_KEY)) ?? '';

    async function pickIcon(tab: string | null, icon: string) {
      const { activeWalletId: walletId } = useWalletStore.getState();
      await act(async () =>
        router.push({ pathname: ROUTES.accountIcon, params: { walletId, index: 0 } }),
      );
      if (tab !== null) await fireEvent.press(await screen.findByRole('radio', { name: tab }));
      await fireEvent.press(await screen.findByRole('radio', { name: icon }));
      await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
      await act(async () => jest.runOnlyPendingTimers());
    }

    it('shows the picked icon on the card, a line icon and then an emoji', async () => {
      await renderRouter('./app', { initialUrl: ROUTES.wallets });
      await findCard();
      expect(screen.getByTestId('account-icon:lucide:wallet-minimal')).toBeOnTheScreen();

      await pickIcon(null, 'Piggy bank');
      expect(screen.getByTestId('account-icon:lucide:piggy-bank')).toBeOnTheScreen();
      expect(screen.queryByTestId('account-icon:lucide:wallet-minimal')).toBeNull();

      await pickIcon('Emoji', '💰');
      expect(screen.getByTestId('account-icon:emoji:💰')).toBeOnTheScreen();
    });

    it('keeps the icon after the app restarts', async () => {
      const app = await renderRouter('./app', { initialUrl: ROUTES.wallets });
      await findCard();
      await pickIcon(null, 'Piggy bank');
      await waitFor(async () => expect(await storedWallet()).toContain('piggy-bank'));
      const stored = await storedWallet();

      // A new launch: nothing in memory, the store loads what AsyncStorage holds.
      app.unmount();
      useWalletStore.setState({ wallets: [], activeWalletId: null, address: null });
      await AsyncStorage.setItem(STORAGE_KEY, stored);
      await useWalletStore.persist.rehydrate();
      await renderRouter('./app', { initialUrl: ROUTES.wallets });

      await findCard();
      expect(screen.getByTestId('account-icon:lucide:piggy-bank')).toBeOnTheScreen();
    });

    it('keeps an existing card intact when the store is upgraded from v2', async () => {
      const current = useWalletStore.getState();
      const wallets = current.wallets.map((wallet) => ({
        ...wallet,
        accounts: wallet.accounts.map(({ icon: _icon, ...account }) => ({
          ...account,
          name: 'Savings',
          color: 'plum',
        })),
      }));
      const v2 = {
        version: 2,
        state: {
          status: current.status,
          wallets,
          activeWalletId: current.activeWalletId,
          accountIndex: current.accountIndex,
          address: current.address,
          source: current.source,
          isRecoveryRequired: false,
        },
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(v2));
      await useWalletStore.persist.rehydrate();

      await renderRouter('./app', { initialUrl: ROUTES.wallets });

      expect(
        await screen.findByRole('button', { name: /^Savings, 0xf39F…2266/ }, CARD_TIMEOUT),
      ).toBeOnTheScreen();
      expect(screen.getByTestId('account-icon:lucide:wallet-minimal')).toBeOnTheScreen();
      expect(useWalletStore.getState().wallets[0]?.accounts[0]).toMatchObject({
        name: 'Savings',
        color: 'plum',
        address: ADDRESS,
        icon: { kind: 'lucide', name: 'wallet-minimal' },
      });
    });
  });
});
