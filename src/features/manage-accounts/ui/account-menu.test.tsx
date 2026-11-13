import { fireEvent, render, screen } from '@testing-library/react-native';

import { useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { addWalletRecord, seedWalletRecord } from '../../../../jest.seed-wallet';
import { AccountMenu } from './account-menu';

// Public Hardhat test accounts; never hold real funds.
const A0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const A1 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const B0 = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';

const state = () => useWalletStore.getState();

/** Wallet 1: a phrase wallet with two accounts. Wallet 2: a private key, one account. */
async function openMenu(target: 'phrase' | 'key') {
  const firstId = seedWalletRecord({ source: 'mnemonic', address: A0 });
  state().activate();
  state().addAccount(firstId, { index: 1, address: A1 });
  const secondId = addWalletRecord({ source: 'private-key', address: B0 });
  const callbacks = { onPersonalize: jest.fn(), onReceive: jest.fn(), onRemoveWallet: jest.fn() };
  const walletId = target === 'key' ? secondId : firstId;
  const view = await render(<AccountMenu account={{ walletId, index: 0 }} {...callbacks} />);
  return { ...callbacks, view };
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('AccountMenu', () => {
  it('names the account, its wallet and its address', async () => {
    await openMenu('key');
    expect(screen.getByRole('header', { name: 'Account 1' })).toBeOnTheScreen();
    expect(screen.getByText('Wallet 2, 0x3C44…93BC')).toBeOnTheScreen();
  });

  it('is a short list of actions: every item shows without scrolling, and nothing is edited inline', async () => {
    const { view } = await openMenu('key');
    const names = screen.getAllByRole('button').map((row) => row.props.accessibilityLabel);
    expect(names).toEqual([
      'Personalize',
      'Show receive QR code',
      'Remove wallet from this device',
    ]);
    // No scroll container: the sheet is as tall as these rows.
    expect(JSON.stringify(view.toJSON())).not.toContain('ScrollView');
    expect(screen.queryByLabelText('Account name')).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('opens personalize, the receive code and remove wallet', async () => {
    const callbacks = await openMenu('key');
    await fireEvent.press(screen.getByRole('button', { name: 'Personalize' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Show receive QR code' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Remove wallet from this device' }));
    expect(callbacks.onPersonalize).toHaveBeenCalledTimes(1);
    expect(callbacks.onReceive).toHaveBeenCalledTimes(1);
    expect(callbacks.onRemoveWallet).toHaveBeenCalledTimes(1);
  });

  it('does not offer to remove a wallet from one of its several accounts', async () => {
    await openMenu('phrase');
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Remove wallet from this device' })).toBeNull();
  });
});
