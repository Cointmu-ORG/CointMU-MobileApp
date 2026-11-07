import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { useBalanceStore } from '@/entities/account';
import { saveWalletSecret, useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { AccountsSettings } from './accounts-settings';

// Public Hardhat test vector; never holds real funds.
const PHRASE = 'test test test test test test test test test test test junk';
const KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const A0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const A1 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

async function setUpWallet(source: 'mnemonic' | 'private-key') {
  await saveWalletSecret(
    source === 'mnemonic'
      ? { kind: 'mnemonic', phrase: PHRASE }
      : { kind: 'private-key', privateKey: KEY },
  );
  useWalletStore.getState().startPinSetup(A0, source);
  useWalletStore.getState().activate();
  await render(<AccountsSettings />);
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  useWalletStore.getState().reset();
});

describe('AccountsSettings', () => {
  it('adds the next derived account, switches to it and back', async () => {
    await setUpWallet('mnemonic');
    useBalanceStore.setState({ wei: 5n, status: 'success' });

    await fireEvent.press(screen.getByRole('button', { name: 'Add account' }));

    expect(await screen.findByRole('radio', { name: 'Account 2' })).toBeChecked();
    expect(useWalletStore.getState()).toMatchObject({ accountIndex: 1, address: A1 });
    // The old account's balance never shows under the new one.
    expect(useBalanceStore.getState().wei).toBeNull();

    await fireEvent.press(screen.getByRole('radio', { name: 'Account 1' }));
    expect(useWalletStore.getState()).toMatchObject({ accountIndex: 0, address: A0 });
    expect(screen.getByRole('radio', { name: 'Account 1' })).toBeChecked();
  });

  it('renames the active account', async () => {
    await setUpWallet('mnemonic');
    await fireEvent.changeText(screen.getByLabelText('Name for Account 1'), '  Savings  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Savings' })).toBeOnTheScreen());
    expect(useWalletStore.getState().accounts[0]?.name).toBe('Savings');
  });

  it('cannot add accounts to a private-key wallet and says why', async () => {
    await setUpWallet('private-key');
    expect(screen.getByRole('button', { name: 'Add account' })).toBeDisabled();
    expect(screen.getByText(/imported from a private key/)).toBeOnTheScreen();
  });
});
