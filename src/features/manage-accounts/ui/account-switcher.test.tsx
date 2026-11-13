import { fireEvent, render, screen, within } from '@testing-library/react-native';

import { useAccountBalancesStore, useBalanceStore } from '@/entities/account';
import { useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { addWalletRecord, seedWalletRecord } from '../../../../jest.seed-wallet';
import { AccountSwitcher } from './account-switcher';

// Public Hardhat test accounts; never hold real funds.
const A0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const A1 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const B0 = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
const TWO_CMU = 2n * 10n ** 18n;

const state = () => useWalletStore.getState();

/** Wallet 1 (phrase, two accounts, active) and wallet 2 (private key). */
async function setUp() {
  const firstId = seedWalletRecord({ source: 'mnemonic', address: A0 });
  state().activate();
  state().addAccount(firstId, { index: 1, address: A1 });
  const secondId = addWalletRecord({ source: 'private-key', address: B0 });
  state().selectAccount(firstId, 0);
  useBalanceStore.setState({ wei: TWO_CMU, status: 'success' });
  useAccountBalancesStore.setState({
    balances: {
      [A0.toLowerCase()]: { wei: TWO_CMU, status: 'success' },
      [B0.toLowerCase()]: { wei: 5n * TWO_CMU, status: 'success' },
    },
    // Nothing here reaches an RPC: the balances above are what the sheet shows.
    refresh: jest.fn(async () => undefined),
  });
  const onDone = jest.fn();
  await render(<AccountSwitcher onDone={onDone} />);
  return { onDone, firstId, secondId };
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  state().reset();
});

describe('AccountSwitcher', () => {
  it('lists the accounts of every wallet under the wallet name', async () => {
    await setUp();
    expect(screen.getByRole('header', { name: 'Wallet 1' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Wallet 2' })).toBeOnTheScreen();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'Account 1, 2 CMU' })).toBeChecked();
    // Every account shows its own balance, not only the one in use.
    expect(screen.getByRole('radio', { name: 'Account 1, 10 CMU' })).not.toBeChecked();
  });

  it('keeps the account in use above the list, outside the part that scrolls', async () => {
    await setUp();
    const current = screen.getByRole('header', { name: 'Selected' });
    const list = screen.getByTestId('account-switcher-list');
    expect(current).toBeOnTheScreen();
    expect(within(list).queryByRole('header', { name: 'Selected' })).toBeNull();
    expect(within(list).getAllByRole('radio')).toHaveLength(3);
  });

  it('switches to an account of another wallet on tap, clears the balance and closes', async () => {
    const { onDone, secondId } = await setUp();

    await fireEvent.press(screen.getByRole('radio', { name: 'Account 1, 10 CMU' }));

    expect(state()).toMatchObject({ activeWalletId: secondId, accountIndex: 0, address: B0 });
    // The old account's balance never shows under the new one.
    expect(useBalanceStore.getState().wei).toBeNull();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('leaves out a wallet that cannot be used yet', async () => {
    const { secondId } = await setUp();
    state().setUnreadableWallets([secondId]);
    await screen.findAllByRole('radio');
    expect(screen.queryByRole('header', { name: 'Wallet 2' })).toBeNull();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });
});
