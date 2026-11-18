import { render, screen } from '@testing-library/react-native';

import { useBalanceStore } from '@/entities/account';
import { useWalletStore, type WalletAccount } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';
import { DEFAULT_APPEARANCE, useAppearanceStore } from '@/shared/model';

import { seedWalletRecord } from '../../../../jest.seed-wallet';
import { SourceField } from './source-field';

// A public Hardhat test account; never holds real funds.
const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

/** 997.999978999999999999 CMU: the balance from the device report. */
const BALANCE = 997_999_978_999_999_999_999n;

beforeEach(async () => {
  await i18n.changeLanguage('en');
  useAppearanceStore.setState(DEFAULT_APPEARANCE);
  useBalanceStore.setState({ wei: BALANCE, status: 'success' });
  seedWalletRecord({ source: 'private-key', address: ADDRESS });
});

function account(): WalletAccount {
  const first = useWalletStore.getState().wallets[0]?.accounts[0];
  if (!first) throw new Error('The seeded wallet has no account');
  return first;
}

describe('SourceField balance', () => {
  it('uses the display decimals, like the picker sheet, not every decimal', async () => {
    await render(<SourceField account={account()} onPress={jest.fn()} />);
    expect(screen.getByText('997.999978 CMU')).toBeOnTheScreen();
  });

  it('shortens by decimals, never with an ellipsis, when "full" decimals are chosen', async () => {
    useAppearanceStore.setState({ ...DEFAULT_APPEARANCE, balanceDecimals: 'full' });
    await render(<SourceField account={account()} onPress={jest.fn()} />);
    expect(screen.getByText('997.99997899 CMU')).toBeOnTheScreen();
    expect(screen.queryByText(/^[\d.,]+…/)).toBeNull();
  });
});
