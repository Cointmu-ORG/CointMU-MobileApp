import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Linking } from 'react-native';

import { storeNewPin, useAuthPrefsStore, useSessionStore } from '@/entities/auth';
import { saveWalletSecret, useWalletStore } from '@/entities/wallet';
import { EXTERNAL_LINKS, getAppInfo } from '@/shared/config';
import { i18n } from '@/shared/i18n';
import { DEFAULT_APPEARANCE, useAppearanceStore } from '@/shared/model';

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
  useAppearanceStore.setState({ ...DEFAULT_APPEARANCE, hasHydrated: true });
});

afterEach(() => jest.restoreAllMocks());

async function open(url: string, heading: string | RegExp) {
  await renderRouter('./app', { initialUrl: url });
  return screen.findByText(heading, {}, { timeout: 5_000 });
}

async function openSettings() {
  await renderRouter('./app', { initialUrl: '/settings' });
  return screen.findByRole('header', { name: 'Settings' }, { timeout: 5_000 });
}

describe('Settings tab', () => {
  it('shows one row per group with its current value', async () => {
    await openSettings();
    for (const name of [
      'Appearance, System',
      'Language, English',
      'Accounts, Account 1',
      'Network, rpc.test.invalid',
      'Security, Auto-lock: 1 min',
      `About, v${getAppInfo().version}`,
    ]) {
      expect(screen.getByRole('button', { name })).toBeOnTheScreen();
    }
    expect(
      screen.getByRole('button', { name: 'Remove wallet from this device' }),
    ).toBeOnTheScreen();
  });

  it('opens each group on its own screen', async () => {
    await openSettings();
    await fireEvent.press(screen.getByRole('button', { name: 'Appearance, System' }));
    expect(await screen.findByText('Accent color')).toBeOnTheScreen();
  });

  it('locks right away with Lock now', async () => {
    await openSettings();
    await fireEvent.press(screen.getByRole('button', { name: 'Lock now' }));
    expect(await screen.findByText('Enter your PIN')).toBeOnTheScreen();
    expect(useSessionStore.getState().isUnlocked).toBe(false);
  });
});

describe('Settings > Language', () => {
  it('switches the language right away and remembers it', async () => {
    await open('/language', 'Bahasa Indonesia');
    await fireEvent.press(screen.getByRole('radio', { name: 'Bahasa Indonesia' }));
    expect(await screen.findByText(/Langsung diterapkan/)).toBeOnTheScreen();
    await expect(AsyncStorage.getItem('muvo.language')).resolves.toBe('id');
  });
});

describe('Settings > Appearance', () => {
  it('applies the theme, the accent and the display choices at once', async () => {
    await open('/appearance', 'Accent color');

    await fireEvent.press(screen.getByRole('radio', { name: 'Dark' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Purple' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Compact' }));
    await fireEvent.press(screen.getByRole('radio', { name: '24-hour' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Full' }));

    expect(useAppearanceStore.getState()).toMatchObject({
      theme: 'dark',
      accent: 'purple',
      density: 'compact',
      timeFormat: '24h',
      balanceDecimals: 'full',
    });
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(await screen.findByText('Selected: Purple')).toBeOnTheScreen();
  });

  it('turns the privacy options on', async () => {
    await open('/appearance', 'Privacy');
    await fireEvent(screen.getByLabelText('Hide balances'), 'valueChange', true);
    await fireEvent(screen.getByLabelText('Hide Muvo in the app switcher'), 'valueChange', true);

    expect(useAppearanceStore.getState()).toMatchObject({
      hidesBalances: true,
      hidesAppInSwitcher: true,
    });
    expect(screen.getByText(/always block screenshots/)).toBeOnTheScreen();
  });
});

describe('Settings > Security', () => {
  it('holds PIN, biometrics, auto-lock, backups, the attempt counter and remove wallet', async () => {
    await open('/security', 'Access');
    for (const name of ['Change PIN', 'Lock now', 'Remove wallet from this device']) {
      expect(screen.getByRole('button', { name })).toBeOnTheScreen();
    }
    expect(screen.getByText('Recovery phrase')).toBeOnTheScreen();
    expect(screen.getByText('Show private key')).toBeOnTheScreen();
    expect(await screen.findByText('0 of 10')).toBeOnTheScreen();
  });

  it('changes the auto-lock timeout', async () => {
    await open('/security', 'Access');
    await fireEvent.press(screen.getByRole('radio', { name: 'Immediately' }));
    expect(useAuthPrefsStore.getState().autoLockMs).toBe(0);
  });

  it('disables the biometrics switch with the reason on a phone without a sensor', async () => {
    await open('/security', 'Access');
    expect(
      await screen.findByText('This phone has no fingerprint or face sensor.'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Unlock with biometrics').props.disabled).toBe(true);
  });

  it('shows the notice after biometric unlock was switched off, until it is dismissed', async () => {
    useAuthPrefsStore.setState({ hasBiometricsOffNotice: true });
    await open('/security', 'Biometric unlock was turned off');
    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByText('Biometric unlock was turned off')).toBeNull();
    expect(useAuthPrefsStore.getState().hasBiometricsOffNotice).toBe(false);
  });
});

describe('Settings > About', () => {
  it('shows the app, version with codename, chain and node', async () => {
    const { version, codename, build } = getAppInfo();
    await open('/about', `Version ${version}-${codename} (build ${build ?? 'development'})`);
    expect(codename).not.toBe('');
    expect(screen.getByRole('header', { name: 'Muvo' })).toBeOnTheScreen();
    expect(screen.getByText('1912')).toBeOnTheScreen();
    expect(screen.getByText('rpc.test.invalid')).toBeOnTheScreen();
    expect(screen.getByText('© 2026 CointMU Foundation • MIT License')).toBeOnTheScreen();
  });

  it('opens links in the system browser', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await open('/about', 'Documentation');
    await fireEvent.press(screen.getByRole('link', { name: 'Release notes' }));
    expect(openURL).toHaveBeenCalledWith(EXTERNAL_LINKS.releaseNotes);
  });
});
