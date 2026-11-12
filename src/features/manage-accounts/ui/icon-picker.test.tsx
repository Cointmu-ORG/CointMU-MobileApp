import { fireEvent, render, screen } from '@testing-library/react-native';

import { useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { seedWalletRecord } from '../../../../jest.seed-wallet';
import { AccountIconSheet } from './account-icon-sheet';
import { AccountSetup } from './account-setup';
import { WalletDetailsForm } from './wallet-details-form';

// Public Hardhat test account; never holds real funds.
const A0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

const state = () => useWalletStore.getState();
const firstWallet = () => {
  const wallet = state().wallets[0];
  if (wallet === undefined) throw new Error('expected a wallet');
  return wallet;
};
const firstAccount = () => firstWallet().accounts[0];
let walletId = '';

beforeEach(async () => {
  await i18n.changeLanguage('en');
  walletId = seedWalletRecord({ source: 'mnemonic', address: A0 });
  state().activate();
});

describe('AccountIconSheet', () => {
  it('saves a line icon at once and shows it on the preview', async () => {
    const onDone = jest.fn();
    await render(<AccountIconSheet account={{ walletId, index: 0 }} onDone={onDone} />);
    expect(screen.getByRole('radio', { name: 'Wallet' })).toBeChecked();

    await fireEvent.press(screen.getByRole('radio', { name: 'Piggy bank' }));

    expect(firstAccount()?.icon).toEqual({ kind: 'lucide', name: 'piggy-bank' });
    expect(screen.getByRole('radio', { name: 'Piggy bank' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Wallet' })).not.toBeChecked();
    expect(screen.getByLabelText('Card preview: Account 1, icon: Piggy bank')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('picks an emoji from a group', async () => {
    await render(<AccountIconSheet account={{ walletId, index: 0 }} onDone={jest.fn()} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Emoji' }));
    expect(screen.getByRole('radio', { name: '💰' })).toBeOnTheScreen();
    expect(screen.queryByRole('radio', { name: '🏠' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Places' }));
    await fireEvent.press(screen.getByRole('radio', { name: '🏠' }));

    expect(firstAccount()?.icon).toEqual({ kind: 'emoji', value: '🏠' });
    expect(screen.getByTestId('account-icon:emoji:🏠')).toBeOnTheScreen();
  });

  it('opens on the tab and group of the current emoji', async () => {
    state().setAccountIcon(walletId, 0, { kind: 'emoji', value: '🎮' });
    await render(<AccountIconSheet account={{ walletId, index: 0 }} onDone={jest.fn()} />);
    expect(screen.getByRole('radio', { name: '🎮' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Hobbies' })).toBeSelected();
  });

  it('shows the default icon for a stored icon that is no longer offered', async () => {
    const stale = { kind: 'lucide', name: 'removed-icon' } as never;
    state().setAccountIcon(walletId, 0, stale);
    await render(<AccountIconSheet account={{ walletId, index: 0 }} onDone={jest.fn()} />);
    expect(screen.getByTestId('account-icon:lucide:wallet-minimal')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Wallet' })).toBeChecked();
  });

  it('labels the icons in Indonesian', async () => {
    await i18n.changeLanguage('id');
    await render(<AccountIconSheet account={{ walletId, index: 0 }} onDone={jest.fn()} />);
    expect(screen.getByRole('radio', { name: 'Celengan' })).toBeOnTheScreen();
  });
});

describe('AccountSetup (after "Add account")', () => {
  it('previews the name while typing and saves name, color and icon', async () => {
    const onDone = jest.fn();
    await render(<AccountSetup account={{ walletId, index: 0 }} onDone={onDone} />);
    await fireEvent.changeText(screen.getByLabelText('Account name'), 'Holiday');
    expect(screen.getByLabelText('Card preview: Holiday, icon: Wallet')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Violet' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Plane' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));

    expect(firstAccount()).toMatchObject({
      name: 'Holiday',
      color: 'violet',
      icon: { kind: 'lucide', name: 'plane' },
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('WalletDetailsForm', () => {
  it('sets the icon of the first card only when saved (create and import)', async () => {
    const onSaved = jest.fn();
    await render(
      <WalletDetailsForm
        wallet={firstWallet()}
        firstAccount={firstAccount()}
        submitLabel="Finish"
        onSaved={onSaved}
      />,
    );
    await fireEvent.changeText(screen.getByLabelText('Wallet name'), 'Family');
    await fireEvent.press(screen.getByRole('radio', { name: 'Gift' }));
    expect(screen.getByLabelText('Card preview: Family, icon: Gift')).toBeOnTheScreen();
    expect(firstAccount()?.icon).toEqual({ kind: 'lucide', name: 'wallet-minimal' });

    await fireEvent.press(screen.getByRole('button', { name: 'Finish' }));

    expect(firstWallet().name).toBe('Family');
    expect(firstAccount()?.icon).toEqual({ kind: 'lucide', name: 'gift' });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('has no icon picker in the wallet edit sheet', async () => {
    await render(
      <WalletDetailsForm wallet={firstWallet()} submitLabel="Save" onSaved={jest.fn()} />,
    );
    expect(screen.queryByRole('radio', { name: 'Piggy bank' })).toBeNull();
  });
});
