import { fireEvent, render, screen } from '@testing-library/react-native';

import { useBalanceStore } from '@/entities/account';
import { useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';
import { DEFAULT_APPEARANCE, useAppearanceStore, usePrivacyRevealStore } from '@/shared/model';

import { BalanceCard } from './balance-card';

const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const ONE_AND_A_HALF_CMU = 1_500_000_000_000_000_000n;

jest.mock('../model/use-balance-polling', () => ({ useBalancePolling: jest.fn() }));

beforeEach(async () => {
  await i18n.changeLanguage('en');
  useAppearanceStore.setState(DEFAULT_APPEARANCE);
  usePrivacyRevealStore.getState().hide();
  useWalletStore.getState().startPinSetup(ADDRESS, 'mnemonic');
  useBalanceStore.setState({ wei: ONE_AND_A_HALF_CMU, status: 'success' });
});

describe('BalanceCard privacy', () => {
  it('shows the balance and no eye while "Hide balances" is off', async () => {
    await render(<BalanceCard />);
    expect(screen.getByText('1.5')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Show balances' })).toBeNull();
  });

  it('masks the balance and reveals it for a while when the eye is tapped', async () => {
    useAppearanceStore.setState({ hidesBalances: true });
    await render(<BalanceCard />);
    expect(screen.getByText('••••')).toBeOnTheScreen();
    expect(screen.queryByText('1.5')).toBeNull();
    // The symbol stays, so the row still says what is hidden.
    expect(screen.getByText('CMU')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Show balances' }));
    expect(screen.getByText('1.5')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Hide balances' }));
    expect(screen.getByText('••••')).toBeOnTheScreen();
    expect(useAppearanceStore.getState().hidesBalances).toBe(true);
  });
});
