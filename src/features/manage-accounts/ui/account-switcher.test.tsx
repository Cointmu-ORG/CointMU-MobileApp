import { fireEvent, render, screen } from '@testing-library/react-native';

import { useBalanceStore } from '@/entities/account';
import { useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { AccountSwitcher } from './account-switcher';

// Public Hardhat test accounts; never hold real funds.
const A0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const A1 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const TWO_CMU = 2n * 10n ** 18n;

async function setUp(source: 'mnemonic' | 'private-key') {
  useWalletStore.getState().startPinSetup(A0, source);
  useWalletStore.getState().activate();
  if (source === 'mnemonic') {
    useWalletStore.getState().addAccount({ index: 1, address: A1 });
  }
  useBalanceStore.setState({ wei: TWO_CMU, status: 'success' });
  const onDone = jest.fn();
  const onManage = jest.fn();
  await render(<AccountSwitcher onDone={onDone} onManage={onManage} />);
  return { onDone, onManage };
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  useWalletStore.getState().reset();
});

describe('AccountSwitcher', () => {
  it('marks the active account with its loaded balance and switches on tap, then closes', async () => {
    const { onDone } = await setUp('mnemonic');
    expect(screen.getByRole('radio', { name: 'Account 1, 2 CMU' })).toBeChecked();
    expect(screen.getByText('0xf39F…2266')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Account 2' }));

    expect(useWalletStore.getState()).toMatchObject({ accountIndex: 1, address: A1 });
    // The old account's balance never shows under the new one.
    expect(useBalanceStore.getState().wei).toBeNull();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('opens the accounts page from Manage', async () => {
    const { onManage, onDone } = await setUp('mnemonic');
    await fireEvent.press(screen.getByRole('button', { name: 'Manage accounts' }));
    expect(onManage).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('cannot add accounts to a private-key wallet and says why', async () => {
    await setUp('private-key');
    expect(screen.getByRole('button', { name: 'Add account' })).toBeDisabled();
    expect(screen.getByText(/imported from a private key/)).toBeOnTheScreen();
  });
});
