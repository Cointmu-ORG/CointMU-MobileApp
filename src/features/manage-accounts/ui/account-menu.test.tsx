import { fireEvent, render, screen } from '@testing-library/react-native';

import { useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { addWalletRecord, seedWalletRecord } from '../../../../jest.seed-wallet';
import { AccountMenu } from './account-menu';

// Public Hardhat test accounts; never hold real funds.
const A0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const B0 = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';

const state = () => useWalletStore.getState();

/** Wallet 1 is active; the menu is opened for the account of wallet 2. */
async function openMenu() {
  const firstId = seedWalletRecord({ source: 'mnemonic', address: A0 });
  state().activate();
  const secondId = addWalletRecord({ source: 'private-key', address: B0 });
  state().selectAccount(firstId, 0);
  const callbacks = { onDone: jest.fn(), onReceive: jest.fn() };
  await render(<AccountMenu account={{ walletId: secondId, index: 0 }} {...callbacks} />);
  return { ...callbacks, firstId, secondId };
}

const account = (walletId: string) =>
  state().wallets.find((wallet) => wallet.id === walletId)?.accounts[0];

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('AccountMenu', () => {
  it('names the account, its wallet and its address', async () => {
    await openMenu();
    expect(screen.getByRole('header', { name: 'Account 1' })).toBeOnTheScreen();
    expect(screen.getByText('Wallet 2, 0x3C44…93BC')).toBeOnTheScreen();
  });

  it('renames and recolors only that account', async () => {
    const { firstId, secondId } = await openMenu();
    await fireEvent.changeText(screen.getByLabelText('Account name'), '  Rent  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save name' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Violet' }));

    expect(account(secondId)).toMatchObject({ name: 'Rent', color: 'violet' });
    expect(account(firstId)).toMatchObject({ name: null });
    expect(account(firstId)?.color).not.toBe('violet');
    expect(await screen.findByText('Name saved')).toBeOnTheScreen();
  });

  it('makes the account active and closes', async () => {
    const { onDone, secondId } = await openMenu();
    await fireEvent.press(screen.getByRole('button', { name: 'Set as active account' }));
    expect(state()).toMatchObject({ activeWalletId: secondId, address: B0 });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('opens the receive code of that account', async () => {
    const { onReceive } = await openMenu();
    await fireEvent.press(screen.getByRole('button', { name: 'Show receive QR code' }));
    expect(onReceive).toHaveBeenCalledTimes(1);
  });
});
