import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { readWalletSecret, saveWalletSecret, useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

const PHRASE = 'test test test test test test test test test test test junk';
const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

beforeEach(async () => {
  await i18n.changeLanguage('en');
  // A normal launch (install marker present) with an active wallet whose PIN record is gone.
  await AsyncStorage.setItem('muvo.installed', '1');
  await saveWalletSecret({ kind: 'mnemonic', phrase: PHRASE });
  useWalletStore.setState({
    status: 'active',
    address: ADDRESS,
    source: 'mnemonic',
    isRecoveryRequired: false,
    hasHydrated: true,
  });
});

describe('startup with unreadable wallet data', () => {
  it('wipes local data and shows recovery instead of the lock screen', async () => {
    const router = await renderRouter('./app', { initialUrl: '/' });

    expect(await screen.findByText("We couldn't read your wallet")).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/recover');
    expect(screen.queryByText('Enter your PIN')).toBeNull();
    expect(useWalletStore.getState()).toMatchObject({ status: 'none', isRecoveryRequired: true });
    await expect(readWalletSecret()).resolves.toBeNull();
    // The import form is offered right on the recovery screen.
    expect(screen.getByRole('button', { name: 'Import wallet' })).toBeOnTheScreen();
  });

  it('lets a user without a backup start over', async () => {
    await renderRouter('./app', { initialUrl: '/' });
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Create a new wallet instead' }),
    );
    expect(await screen.findByText('Welcome to Muvo')).toBeOnTheScreen();
  });
});
