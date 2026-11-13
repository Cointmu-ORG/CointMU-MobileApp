import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';

import { useAccountBalancesStore } from '@/entities/account';
import { storeNewPin, useSessionStore } from '@/entities/auth';
import { useHistoryStore, useTxStore } from '@/entities/transaction';
import { useWalletStore } from '@/entities/wallet';
import { ROUTES } from '@/shared/config';
import { i18n } from '@/shared/i18n';
import { DEFAULT_APPEARANCE, useAppearanceStore } from '@/shared/model';

import { preloadRoutes } from '../../../../jest.preload-routes';
import { addWallet, seedWallet } from '../../../../jest.seed-wallet';

// One stub node: 2 CMU on every address, and 1 CMU received by the second account in the head
// block. No real RPC.
const mockGetBalance = jest.fn(async () => 2n * 10n ** 18n);
jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  createRpcProvider: () => ({
    getBalance: () => mockGetBalance(),
    getBlockNumber: jest.fn(async () => 5_000),
    getBlock: jest.fn(async (n: number) => ({
      timestamp: Math.floor(Date.now() / 1000),
      prefetchedTransactions:
        n === 5_000
          ? [
              {
                hash: '0xincoming',
                from: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
                to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
                value: 10n ** 18n,
                blockNumber: 5_000,
              },
            ]
          : [],
    })),
    getTransactionReceipt: jest.fn(async () => ({ status: 1, blockNumber: 5_000 })),
    getLogs: jest.fn(async () => []),
    getCode: jest.fn(async () => '0x'),
    send: jest.fn(async () => '0x778'),
    destroy: jest.fn(),
  }),
}));

// The scanner opens on its own explanation: the camera is not allowed yet, so none is drawn.
jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [
    { granted: false, canAskAgain: true, status: 'undetermined' },
    jest.fn(),
  ],
  CameraView: () => null,
}));

preloadRoutes();

// Public Hardhat test accounts; never hold real funds.
const PHRASE = 'test test test test test test test test test test test junk';
const A0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const A1 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const KEY = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';
const B0 = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
const TIMEOUT = { timeout: 5_000 };
// The carousel snaps by one card and its gap: screen width minus the gutters and the peek.
const JEST_SCREEN_WIDTH = 750;
const SNAP_INTERVAL = JEST_SCREEN_WIDTH - 2 * 24 - 32 + 12;

const state = () => useWalletStore.getState();
let firstId = '';

async function openHome() {
  const app = await renderRouter('./app', { initialUrl: ROUTES.home });
  await screen.findByRole('button', { name: /^Savings, 0x7099…79C8/ }, TIMEOUT);
  return app;
}

beforeEach(async () => {
  // renderRouter switches to fake timers; the PIN hash below waits for a real frame.
  jest.useRealTimers();
  mockGetBalance.mockClear();
  await i18n.changeLanguage('en');
  await AsyncStorage.setItem('muvo.installed', '1');
  await storeNewPin('135790');
  useHistoryStore.getState().clear();
  useTxStore.getState().clear();
  useAccountBalancesStore.getState().clear();
  firstId = await seedWallet({ secret: { kind: 'mnemonic', phrase: PHRASE }, address: A0 });
  state().activate();
  state().addAccount(firstId, { index: 1, address: A1 });
  state().renameAccount(firstId, 1, 'Savings');
  await addWallet({ secret: { kind: 'private-key', privateKey: KEY }, address: B0 });
  state().selectAccount(firstId, 0);
  useWalletStore.setState({ hasHydrated: true });
  useSessionStore.getState().unlock();
  useAppearanceStore.setState({ ...DEFAULT_APPEARANCE, hasHydrated: true });
});

describe('Home', () => {
  it('shows every account of every wallet as a card, then an Add card', async () => {
    await openHome();
    const carousel = within(screen.getByTestId('account-carousel'));

    expect(carousel.getByRole('button', { name: /^Account 1, 0xf39F…2266/ })).toBeOnTheScreen();
    expect(carousel.getByRole('button', { name: /^Savings, 0x7099…79C8/ })).toBeOnTheScreen();
    expect(carousel.getByRole('button', { name: /^Account 1, 0x3C44…93BC/ })).toBeOnTheScreen();
    expect(carousel.getByRole('button', { name: 'Add an account or wallet' })).toBeOnTheScreen();
    expect(await carousel.findAllByText('2 CMU')).toHaveLength(3);
    expect(screen.getByLabelText('Card 1 of 4')).toBeOnTheScreen();
  });

  it('moves the page dots with the swipe', async () => {
    await openHome();
    await fireEvent.scroll(screen.getByTestId('account-carousel'), {
      nativeEvent: { contentOffset: { x: SNAP_INTERVAL * 2, y: 0 } },
    });
    expect(screen.getByLabelText('Card 3 of 4')).toBeOnTheScreen();
  });

  it('has two actions only: Transfer and Scan QR', async () => {
    const app = await openHome();
    expect(screen.getByRole('button', { name: 'Scan QR' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Receive' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Transfer' }));
    await waitFor(() => expect(app.getPathname()).toBe(ROUTES.send));
    // The send form opens with the source selector on the default account.
    expect(await screen.findByRole('button', { name: /^From Account 1/ })).toBeOnTheScreen();
  });

  it('lists the newest activity of all accounts, naming the account, with a way to the rest', async () => {
    const app = await openHome();
    // Received by the second account while the first one is the default account.
    expect(
      await screen.findByRole('button', { name: /^Savings: Received \+1 CMU/ }, TIMEOUT),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'See all' }));
    await waitFor(() => expect(app.getPathname()).toBe(ROUTES.history));
  });

  it('hides every amount when the eye is tapped', async () => {
    await openHome();
    await screen.findByRole('button', { name: /^Savings: Received \+1 CMU/ }, TIMEOUT);

    await fireEvent.press(screen.getByRole('button', { name: 'Hide balances' }));

    expect(screen.getAllByText('•••• CMU')).toHaveLength(3);
    expect(screen.queryByText('2 CMU')).toBeNull();
    expect(screen.queryByText('+1 CMU')).toBeNull();
    expect(screen.getByText('+•••• CMU')).toBeOnTheScreen();
    expect(useAppearanceStore.getState().hidesBalances).toBe(true);
  });

  it('opens an account on its own screen, and Send from there starts from that account', async () => {
    const app = await openHome();
    await fireEvent.press(screen.getByRole('button', { name: /^Savings, 0x7099…79C8/ }));

    await waitFor(() => expect(app.getPathname()).toBe(ROUTES.walletDetail));
    expect(state()).toMatchObject({ activeWalletId: firstId, accountIndex: 1, address: A1 });
    // Looking at an account does not make it the default.
    expect(state().defaultAccount).toEqual({ walletId: firstId, index: 0 });
    // That account's activity only, so the rows no longer need to name it.
    expect(
      await screen.findByRole('button', { name: /^Received \+1 CMU/ }, TIMEOUT),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(app.getPathname()).toBe(ROUTES.send));
    expect(await screen.findByRole('button', { name: /^From Savings/ })).toBeOnTheScreen();
    expect(screen.getByText('0x7099…79C8')).toBeOnTheScreen();
  });

  describe('the default account', () => {
    const defaultRef = () => ({ walletId: firstId, index: 0 });

    it('carries the "Default" badge in the carousel', async () => {
      await openHome();
      const card = screen.getByRole('button', {
        name: 'Account 1, 0xf39F…2266, default account',
      });
      expect(within(card).getByText('Default')).toBeOnTheScreen();
      expect(screen.getAllByText('Default')).toHaveLength(1);
    });

    it('is where Transfer starts, also after another account was looked at', async () => {
      const app = await openHome();
      await fireEvent.press(screen.getByRole('button', { name: /^Savings, 0x7099…79C8/ }));
      await waitFor(() => expect(app.getPathname()).toBe(ROUTES.walletDetail));
      await act(async () => router.back());
      await waitFor(() => expect(app.getPathname()).toBe(ROUTES.home));

      await fireEvent.press(screen.getByRole('button', { name: 'Transfer' }));
      await waitFor(() => expect(app.getPathname()).toBe(ROUTES.send));
      expect(await screen.findByRole('button', { name: /^From Account 1/ })).toBeOnTheScreen();
      expect(screen.getByText('0xf39F…2266')).toBeOnTheScreen();
      expect(state().defaultAccount).toEqual(defaultRef());
    });

    it('is where Scan QR starts too', async () => {
      const app = await openHome();
      await act(async () => state().selectAccount(firstId, 1));
      await fireEvent.press(screen.getByRole('button', { name: 'Scan QR' }));
      await waitFor(() => expect(app.getPathname()).toBe(ROUTES.scan));
      expect(state()).toMatchObject({ accountIndex: 0, address: A0 });
      expect(state().defaultAccount).toEqual(defaultRef());
    });

    it('is not changed by picking another From: the next transfer starts from it again', async () => {
      const app = await openHome();
      await fireEvent.press(screen.getByRole('button', { name: 'Transfer' }));
      await fireEvent.press(await screen.findByRole('button', { name: /^From Account 1/ }));
      expect(await screen.findByRole('header', { name: 'Send from' })).toBeOnTheScreen();
      await fireEvent.press(screen.getAllByRole('radio', { checked: false })[0]);
      await act(async () => jest.runOnlyPendingTimers());
      // This send only: the form shows the picked account.
      expect(await screen.findByRole('button', { name: /^From Savings/ })).toBeOnTheScreen();
      expect(state().defaultAccount).toEqual(defaultRef());

      await act(async () => router.back());
      await waitFor(() => expect(app.getPathname()).toBe(ROUTES.home));
      await fireEvent.press(screen.getByRole('button', { name: 'Transfer' }));

      expect(await screen.findByRole('button', { name: /^From Account 1/ })).toBeOnTheScreen();
      expect(screen.getByText('0xf39F…2266')).toBeOnTheScreen();
    });

    it('keeps the account of a wallet detail for a send started there, after From was changed', async () => {
      const app = await openHome();
      await fireEvent.press(screen.getByRole('button', { name: /^Savings, 0x7099…79C8/ }));
      await fireEvent.press(await screen.findByRole('button', { name: 'Send' }));
      await screen.findByRole('button', { name: /^From Savings/ });
      // Another source for that send, then back to the account's screen.
      await act(async () => state().selectAccount(firstId, 0));
      await act(async () => router.back());
      await waitFor(() => expect(app.getPathname()).toBe(ROUTES.walletDetail));

      await fireEvent.press(await screen.findByRole('button', { name: 'Send' }));
      expect(await screen.findByRole('button', { name: /^From Savings/ })).toBeOnTheScreen();
      expect(state().defaultAccount).toEqual(defaultRef());
    });

    it('moves to the first readable account when its wallet is removed, and says so once', async () => {
      await openHome();
      expect(screen.queryByText('Default account changed')).toBeNull();

      await act(async () => state().removeWallet(firstId));

      const secondId = state().wallets[0]?.id;
      expect(state().defaultAccount).toEqual({ walletId: secondId, index: 0 });
      expect(await screen.findByText('Default account changed')).toBeOnTheScreen();
      expect(
        screen.getByText(/Account 1 is now your default account for transfers/),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: 'Account 1, 0x3C44…93BC, default account' }),
      ).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));
      expect(screen.queryByText('Default account changed')).toBeNull();
      expect(state().hasDefaultMovedNotice).toBe(false);
    });

    it('moves off a wallet that can no longer be read, with the same notice', async () => {
      await openHome();
      await act(async () => state().setUnreadableWallets([firstId]));
      expect(await screen.findByText('Default account changed')).toBeOnTheScreen();
      expect(state().defaultAccount?.walletId).not.toBe(firstId);
    });
  });

  it('opens the history of that account from its screen', async () => {
    const app = await renderRouter('./app', { initialUrl: ROUTES.home });
    await fireEvent.press(
      await screen.findByRole('button', { name: /^Savings, 0x7099…79C8/ }, TIMEOUT),
    );
    await fireEvent.press(await screen.findByRole('button', { name: 'See all' }, TIMEOUT));

    await waitFor(() => expect(app.getPathname()).toBe(ROUTES.history));
    expect(await screen.findByRole('radio', { name: 'Savings' }, TIMEOUT)).toBeChecked();
  });
});
