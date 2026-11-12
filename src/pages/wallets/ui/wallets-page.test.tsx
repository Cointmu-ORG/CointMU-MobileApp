import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

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
});
