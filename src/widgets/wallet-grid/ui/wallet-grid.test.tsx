import { fireEvent, render, screen, within } from '@testing-library/react-native';

import { useAccountBalancesStore } from '@/entities/account';
import { useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';
import { DEFAULT_APPEARANCE, useAppearanceStore, usePrivacyRevealStore } from '@/shared/model';

import { addWalletRecord, seedWalletRecord } from '../../../../jest.seed-wallet';
import type { WalletGridActions } from '../model/types';
import { WalletGrid } from './wallet-grid';

// Balances are set in the store directly; nothing here polls or reaches an RPC.
jest.mock('../model/use-account-balances', () => ({ useAccountBalances: jest.fn() }));

// Public Hardhat test accounts; never hold real funds.
const A0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const A1 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const B0 = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
const CMU = 10n ** 18n;

const state = () => useWalletStore.getState();

function actions(): jest.Mocked<WalletGridActions> {
  return {
    onSelectAccount: jest.fn(),
    onAccountMenu: jest.fn(),
    onEditWallet: jest.fn(),
    onResumeBackup: jest.fn(),
    onRecoverWallet: jest.fn(),
    onRemoveWallet: jest.fn(),
    onAdd: jest.fn(),
  };
}

function setBalance(address: string, wei: bigint | null, status: 'success' | 'error' = 'success') {
  const { balances } = useAccountBalancesStore.getState();
  useAccountBalancesStore.setState({
    balances: { ...balances, [address.toLowerCase()]: { wei, status } },
  });
}

/** Wallet 1: a phrase wallet with two accounts (the first active). Wallet 2: a private key. */
function seedWallets() {
  const firstId = seedWalletRecord({ source: 'mnemonic', address: A0 });
  state().activate();
  state().addAccount(firstId, { index: 1, address: A1 });
  state().renameAccount(firstId, 1, 'Savings');
  const secondId = addWalletRecord({ source: 'private-key', address: B0 });
  state().selectAccount(firstId, 0);
  setBalance(A0, 15n * (CMU / 10n));
  setBalance(A1, 2n * CMU);
  setBalance(B0, 0n);
  return { firstId, secondId };
}

const card = (name: RegExp) => screen.getByRole('button', { name });

beforeEach(async () => {
  await i18n.changeLanguage('en');
  useAppearanceStore.setState(DEFAULT_APPEARANCE);
  usePrivacyRevealStore.getState().hide();
  useAccountBalancesStore.getState().clear();
});

describe('WalletGrid', () => {
  it('shows one card per account, grouped under each wallet name', async () => {
    seedWallets();
    await render(<WalletGrid actions={actions()} />);

    expect(screen.getByRole('header', { name: 'Wallet 1' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Wallet 2' })).toBeOnTheScreen();
    expect(screen.getByText('Recovery phrase, 2 accounts')).toBeOnTheScreen();
    expect(screen.getByText('Private key, 1 account')).toBeOnTheScreen();

    const first = card(/^Account 1, 0xf39F…2266, active account$/);
    expect(within(first).getByText('1.5 CMU')).toBeOnTheScreen();
    expect(within(first).getByText('Active')).toBeOnTheScreen();
    const savings = card(/^Savings, 0x7099…79C8$/);
    expect(within(savings).getByText('2 CMU')).toBeOnTheScreen();
    expect(within(savings).queryByText('Active')).toBeNull();
    expect(within(card(/^Account 1, 0x3C44…93BC$/)).getByText('0 CMU')).toBeOnTheScreen();
  });

  it('masks every balance while "Hide balances" is on, and keeps the symbol', async () => {
    seedWallets();
    useAppearanceStore.setState({ hidesBalances: true });
    await render(<WalletGrid actions={actions()} />);

    expect(screen.getAllByText('•••• CMU')).toHaveLength(3);
    expect(screen.queryByText('1.5 CMU')).toBeNull();
    expect(screen.queryByText('2 CMU')).toBeNull();
  });

  it('reports a tap, a long press and the menu button with the account they belong to', async () => {
    const { firstId, secondId } = seedWallets();
    const handlers = actions();
    await render(<WalletGrid actions={handlers} />);

    await fireEvent.press(card(/^Account 1, 0x3C44…93BC$/));
    expect(handlers.onSelectAccount).toHaveBeenCalledWith({ walletId: secondId, index: 0 });

    await fireEvent(card(/^Savings/), 'longPress');
    await fireEvent.press(screen.getByRole('button', { name: 'More options for Savings' }));
    expect(handlers.onAccountMenu).toHaveBeenCalledTimes(2);
    expect(handlers.onAccountMenu).toHaveBeenLastCalledWith({ walletId: firstId, index: 1 });

    await fireEvent.press(screen.getByRole('button', { name: 'Edit Wallet 2' }));
    expect(handlers.onEditWallet).toHaveBeenCalledWith(secondId);
  });

  it('shows a placeholder while a balance loads and a note when it failed', async () => {
    seedWallets();
    useAccountBalancesStore.getState().clear();
    setBalance(A1, null, 'error');
    await render(<WalletGrid actions={actions()} />);

    expect(screen.getAllByLabelText('Loading balance')).toHaveLength(2);
    expect(within(card(/^Savings/)).getByText('Balance unavailable')).toBeOnTheScreen();
    // One account failing is not a network outage.
    expect(screen.queryByText(/Can't reach the CointMU network/)).toBeNull();
  });

  it('explains an unreachable network once, with a retry', async () => {
    seedWallets();
    for (const address of [A0, A1, B0]) setBalance(address, null, 'error');
    await render(<WalletGrid actions={actions()} />);

    expect(screen.getByText(/Can't reach the CointMU network/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeOnTheScreen();
  });

  it('replaces the cards of a wallet that cannot be used with what to do about it', async () => {
    const { secondId } = seedWallets();
    const pendingId = addWalletRecord({ source: 'mnemonic', address: A1, origin: 'created' });
    state().setUnreadableWallets([secondId]);
    const handlers = actions();
    await render(<WalletGrid actions={handlers} />);

    expect(screen.queryByRole('button', { name: /0x3C44…93BC/ })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Restore wallet' }));
    expect(handlers.onRecoverWallet).toHaveBeenCalledWith(secondId);
    await fireEvent.press(screen.getByRole('button', { name: 'Finish backup' }));
    expect(handlers.onResumeBackup).toHaveBeenCalledWith(pendingId);
    await fireEvent.press(screen.getAllByRole('button', { name: 'Remove this wallet' })[0]);
    expect(handlers.onRemoveWallet).toHaveBeenCalledWith(secondId);
  });

  it('invites adding a wallet when there is none', async () => {
    state().reset();
    const handlers = actions();
    await render(<WalletGrid actions={handlers} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add a wallet' }));
    expect(handlers.onAdd).toHaveBeenCalledTimes(1);
  });
});
