import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';

import { storeNewPin, useSessionStore } from '@/entities/auth';
import { ACCOUNT_EMOJI_GROUPS, useWalletStore } from '@/entities/wallet';
import { PERSONALIZE_SCROLL_ID } from '@/features/manage-accounts';
import { ROUTES } from '@/shared/config';
import { i18n } from '@/shared/i18n';
import { DEFAULT_APPEARANCE, useAppearanceStore } from '@/shared/model';

import { preloadRoutes } from '../../../../jest.preload-routes';
import { seedWallet } from '../../../../jest.seed-wallet';

jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  createRpcProvider: () => ({
    getBalance: jest.fn(async () => 0n),
    getBlockNumber: jest.fn(async () => 10),
    getBlock: jest.fn(async () => ({ timestamp: 0, prefetchedTransactions: [] })),
    getLogs: jest.fn(async () => []),
    send: jest.fn(async () => '0x778'),
    destroy: jest.fn(),
  }),
}));

preloadRoutes();

const PHRASE = 'test test test test test test test test test test test junk';
const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const TIMEOUT = { timeout: 5_000 };
const LAST_EMOJI = ACCOUNT_EMOJI_GROUPS.at(-1)?.emoji.at(-1) ?? '';

const state = () => useWalletStore.getState();
const account = () => state().wallets[0]?.accounts[0];
const saveButton = () => screen.getByRole('button', { name: 'Save' });
let walletId = '';

type Params = { index?: number; setup?: number };

/** Opens the page above the Wallets tab, the way the card menu does. */
async function openPersonalize(params: Params = { index: 0 }) {
  const app = await renderRouter('./app', { initialUrl: ROUTES.wallets });
  await screen.findByRole('button', { name: /^Account 1/ }, TIMEOUT);
  await act(async () =>
    router.push({ pathname: ROUTES.personalize, params: { walletId, ...params } }),
  );
  await screen.findByRole('button', { name: 'Save' }, TIMEOUT);
  return app;
}

/** The buttons of the last alert shown. */
function alertButtons(): AlertButton[] {
  return jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] ?? [];
}

beforeEach(async () => {
  // renderRouter switches to fake timers; the PIN hash below waits for a real frame.
  jest.useRealTimers();
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await i18n.changeLanguage('en');
  await AsyncStorage.setItem('muvo.installed', '1');
  await storeNewPin('135790');
  walletId = await seedWallet({ secret: { kind: 'mnemonic', phrase: PHRASE }, address: ADDRESS });
  state().activate();
  useWalletStore.setState({ hasHydrated: true });
  useSessionStore.getState().unlock();
  useAppearanceStore.setState({ ...DEFAULT_APPEARANCE, hasHydrated: true });
});

afterEach(() => jest.restoreAllMocks());

describe('Personalize page', () => {
  it('saves name, color and icon together, and nothing before Save', async () => {
    const app = await openPersonalize();
    expect(saveButton()).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Account name'), '  Holiday ');
    await fireEvent.press(screen.getByRole('radio', { name: 'Violet' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Plane' }));

    // The preview follows every pick; the stored card does not.
    expect(screen.getByLabelText('Card preview: Holiday, icon: Plane')).toBeOnTheScreen();
    expect(account()).toMatchObject({
      name: null,
      icon: { kind: 'lucide', name: 'wallet-minimal' },
    });
    expect(account()?.color).not.toBe('violet');
    expect(saveButton()).toBeEnabled();

    await fireEvent.press(saveButton());

    expect(account()).toMatchObject({
      name: 'Holiday',
      color: 'violet',
      icon: { kind: 'lucide', name: 'plane' },
    });
    // Saved changes leave without a question.
    await waitFor(() => expect(app.getPathname()).toBe(ROUTES.wallets));
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('keeps Save disabled for a name of spaces only, and says why', async () => {
    await openPersonalize();
    await fireEvent.changeText(screen.getByLabelText('Account name'), '   ');
    expect(saveButton()).toBeDisabled();
    expect(screen.getByText(/needs at least one letter or number/)).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Account name'), 'Rent');
    expect(saveButton()).toBeEnabled();
  });

  it('asks before leaving with unsaved changes, and discards only on request', async () => {
    const app = await openPersonalize();
    await fireEvent.press(screen.getByRole('radio', { name: 'Rose' }));

    await act(async () => router.back());
    expect(Alert.alert).toHaveBeenCalledWith(
      'Discard your changes?',
      expect.any(String),
      expect.any(Array),
    );
    expect(app.getPathname()).toBe(ROUTES.personalize);

    // "Keep editing" stays on the page with the pick intact.
    await act(async () =>
      alertButtons()
        .find((button) => button.text === 'Keep editing')
        ?.onPress?.(),
    );
    expect(app.getPathname()).toBe(ROUTES.personalize);
    expect(screen.getByRole('radio', { name: 'Rose' })).toBeChecked();

    await act(async () => router.back());
    await act(async () =>
      alertButtons()
        .find((button) => button.text === 'Discard')
        ?.onPress?.(),
    );
    await waitFor(() => expect(app.getPathname()).toBe(ROUTES.wallets));
    expect(account()?.color).not.toBe('rose');
  });

  it('leaves without a question when nothing changed', async () => {
    const app = await openPersonalize();
    await act(async () => router.back());
    await waitFor(() => expect(app.getPathname()).toBe(ROUTES.wallets));
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('shows the whole emoji grid in the page scroll, down to its last item', async () => {
    await openPersonalize();
    await fireEvent.press(screen.getByRole('radio', { name: 'Emoji' }));
    const page = screen.getByTestId(PERSONALIZE_SCROLL_ID);

    // Every group is laid out in the page itself: no group to pick first, no inner scroll.
    for (const { emoji } of ACCOUNT_EMOJI_GROUPS) {
      expect(within(page).getByRole('radio', { name: emoji[0] })).toBeOnTheScreen();
    }
    // The preview and Save are outside the part that scrolls.
    expect(within(page).queryByRole('button', { name: 'Save' })).toBeNull();
    expect(within(page).queryByLabelText(/^Card preview/)).toBeNull();

    await fireEvent.scroll(page, { nativeEvent: { contentOffset: { x: 0, y: 2_000 } } });
    await fireEvent.press(within(page).getByRole('radio', { name: LAST_EMOJI }));
    expect(screen.getByTestId(`account-icon:emoji:${LAST_EMOJI}`)).toBeOnTheScreen();
    await fireEvent.press(saveButton());
    expect(account()?.icon).toEqual({ kind: 'emoji', value: LAST_EMOJI });
  });

  it('offers Save at once in the step after "Add account"', async () => {
    await openPersonalize({ index: 0, setup: 1 });
    expect(saveButton()).toBeEnabled();
  });

  it('labels the icons in Indonesian', async () => {
    await i18n.changeLanguage('id');
    const app = await renderRouter('./app', {
      initialUrl: `${ROUTES.personalize}?walletId=${walletId}&index=0`,
    });
    expect(await screen.findByRole('radio', { name: 'Celengan' }, TIMEOUT)).toBeOnTheScreen();
    app.unmount();
  });

  it('edits a wallet with the same page: name and color, no icon, and the way to remove it', async () => {
    await openPersonalize({});
    expect(screen.queryByRole('radio', { name: 'Piggy bank' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Remove wallet from this device' }),
    ).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Wallet name'), 'Family');
    await fireEvent.press(screen.getByRole('radio', { name: 'Rose' }));
    await fireEvent.press(saveButton());

    expect(state().wallets[0]).toMatchObject({ name: 'Family', color: 'rose' });
    // The card still had the wallet's color, so it follows.
    expect(account()?.color).toBe('rose');
  });
});
