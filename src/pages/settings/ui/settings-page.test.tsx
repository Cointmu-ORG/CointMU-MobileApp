import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { storeNewPin, useAuthPrefsStore, useSessionStore } from '@/entities/auth';
import { saveWalletSecret, useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { preloadRoutes } from '../../../../jest.preload-routes';

preloadRoutes();

const PHRASE = 'test test test test test test test test test test test junk';
const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  createRpcProvider: () => ({
    getBalance: jest.fn(async () => 0n),
    send: jest.fn(async () => '0x778'),
    destroy: jest.fn(),
  }),
}));

beforeEach(async () => {
  // renderRouter switches to fake timers; the PIN hash below waits for a real frame.
  jest.useRealTimers();
  await i18n.changeLanguage('en');
  await AsyncStorage.setItem('muvo.installed', '1');
  await saveWalletSecret({ kind: 'mnemonic', phrase: PHRASE });
  await storeNewPin('135790');
  useWalletStore.getState().startPinSetup(ADDRESS, 'mnemonic');
  useWalletStore.getState().activate();
  useWalletStore.setState({ hasHydrated: true });
  useSessionStore.getState().unlock();
});

async function openSettings() {
  await renderRouter('./app', { initialUrl: '/settings' });
  return screen.findByRole('header', { name: 'Settings' }, { timeout: 5_000 });
}

describe('Settings tab', () => {
  it('shows every section with the active account, node and chain', async () => {
    await openSettings();
    for (const title of ['General', 'Accounts', 'Network', 'Security', 'Log out', 'About']) {
      expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('button', { name: 'Active account, Account 1' })).toBeOnTheScreen();
    expect(screen.getAllByText('rpc.test.invalid').length).toBeGreaterThan(0);
    expect(screen.getByText('1912')).toBeOnTheScreen();
  });

  it('switches the language right away and remembers it', async () => {
    await openSettings();
    await fireEvent.press(screen.getByRole('radio', { name: 'Bahasa Indonesia' }));
    expect(await screen.findByRole('header', { name: 'Pengaturan' })).toBeOnTheScreen();
    await expect(AsyncStorage.getItem('muvo.language')).resolves.toBe('id');
  });

  it('changes the auto-lock timeout', async () => {
    await openSettings();
    await fireEvent.press(screen.getByRole('radio', { name: 'Immediately' }));
    expect(useAuthPrefsStore.getState().autoLockMs).toBe(0);
  });

  it('locks right away with Lock now', async () => {
    await openSettings();
    await fireEvent.press(screen.getByRole('button', { name: 'Lock now' }));
    expect(await screen.findByText('Enter your PIN')).toBeOnTheScreen();
    expect(useSessionStore.getState().isUnlocked).toBe(false);
  });
});
