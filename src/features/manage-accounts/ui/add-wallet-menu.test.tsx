import { fireEvent, render, screen } from '@testing-library/react-native';

import { MAX_WALLETS, useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { addWalletRecord, seedWalletRecord } from '../../../../jest.seed-wallet';
import { AddWalletMenu } from './add-wallet-menu';

const state = () => useWalletStore.getState();
const address = (seed: number) => `0x${seed.toString(16).padStart(40, '0')}`;

function handlers() {
  return {
    onAccountAdded: jest.fn(),
    onChooseWallet: jest.fn(),
    onCreate: jest.fn(),
    onImport: jest.fn(),
  };
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  seedWalletRecord({ source: 'mnemonic', address: address(1) });
  state().activate();
});

describe('AddWalletMenu', () => {
  it('is three actions that show without scrolling, however many wallets there are', async () => {
    for (let seed = 2; seed <= MAX_WALLETS; seed += 1) {
      addWalletRecord({ source: 'mnemonic', address: address(seed) });
    }
    const view = await render(<AddWalletMenu {...handlers()} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(JSON.stringify(view.toJSON())).not.toContain('ScrollView');
  });

  it('opens the wallet list when several wallets can take a new account', async () => {
    addWalletRecord({ source: 'mnemonic', address: address(3) });
    const callbacks = handlers();
    await render(<AddWalletMenu {...callbacks} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add an account' }));
    expect(callbacks.onChooseWallet).toHaveBeenCalledTimes(1);
    expect(callbacks.onAccountAdded).not.toHaveBeenCalled();
  });

  it('says where the account goes when only one wallet can take it', async () => {
    addWalletRecord({ source: 'private-key', address: address(2) });
    await render(<AddWalletMenu {...handlers()} />);
    expect(screen.getByText('In Wallet 1')).toBeOnTheScreen();
  });

  it('says why no account can be added when there is no recovery-phrase wallet', async () => {
    seedWalletRecord({ source: 'private-key', address: address(1) });
    state().activate();
    await render(<AddWalletMenu {...handlers()} />);
    expect(
      screen.getByText(/only be added to a wallet that has a recovery phrase/),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Add an account' })).toBeDisabled();
  });

  it('opens create and import', async () => {
    const callbacks = handlers();
    await render(<AddWalletMenu {...callbacks} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Create a new wallet' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Import a wallet' }));
    expect(callbacks.onCreate).toHaveBeenCalledTimes(1);
    expect(callbacks.onImport).toHaveBeenCalledTimes(1);
  });

  it(`refuses new wallets at the limit of ${MAX_WALLETS} and says so`, async () => {
    for (let seed = 2; seed <= MAX_WALLETS; seed += 1) {
      addWalletRecord({ source: 'private-key', address: address(seed) });
    }
    await render(<AddWalletMenu {...handlers()} />);
    expect(screen.getByRole('button', { name: 'Create a new wallet' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Import a wallet' })).toBeDisabled();
    expect(
      screen.getByText(`Muvo holds up to ${MAX_WALLETS} wallets. Remove one to add another.`),
    ).toBeOnTheScreen();
  });
});
