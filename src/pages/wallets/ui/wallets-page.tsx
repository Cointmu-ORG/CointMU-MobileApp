import { router, useIsFocused } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl } from 'react-native';

import { useAccountBalancesStore } from '@/entities/account';
import { useUsableAccounts } from '@/entities/wallet';
import { switchToAccount } from '@/features/manage-accounts';
import { ROUTES } from '@/shared/config';
import { ScrollScreen, useThemeColors } from '@/shared/ui';
import { WalletGrid, type WalletGridActions } from '@/widgets/wallet-grid';

import { WalletsHeader } from './wallets-header';

const openAdd = () => router.push(ROUTES.walletAdd);

/** What each card, section and attention card does. Ids in routes are public data. */
const ACTIONS: WalletGridActions = {
  onSelectAccount: (account) => {
    // Its screen shows the account in use; the default account stays what it is (D-92).
    switchToAccount(account);
    // A sheet that is still opening goes first, so the detail is never stacked on a sheet.
    if (router.canDismiss()) router.dismissAll();
    router.push({ pathname: ROUTES.walletDetail, params: account });
  },
  onAccountMenu: ({ walletId, index }) =>
    router.push({ pathname: ROUTES.accountMenu, params: { walletId, index } }),
  onEditWallet: (walletId) => router.push({ pathname: ROUTES.personalize, params: { walletId } }),
  onResumeBackup: (walletId) =>
    router.push({ pathname: ROUTES.walletCreate, params: { walletId } }),
  onRecoverWallet: (walletId) =>
    router.push({ pathname: ROUTES.walletImport, params: { recover: walletId } }),
  onRemoveWallet: (walletId) =>
    router.push({ pathname: ROUTES.removeWallet, params: { walletId } }),
  onAdd: openAdd,
};

/** The Wallets tab (D-80): every account of every wallet as a card, grouped by wallet. */
export function WalletsPage() {
  const colors = useThemeColors();
  const isFocused = useIsFocused();
  const accounts = useUsableAccounts();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const addresses = useMemo(() => accounts.map((account) => account.address), [accounts]);

  const refresh = async () => {
    setIsRefreshing(true);
    await useAccountBalancesStore.getState().refresh(addresses);
    setIsRefreshing(false);
  };

  return (
    <ScrollScreen
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void refresh()}
          tintColor={colors.accent.DEFAULT}
          colors={[colors.accent.DEFAULT]}
        />
      }
    >
      <WalletsHeader onAdd={openAdd} />
      <WalletGrid actions={ACTIONS} isFocused={isFocused} />
    </ScrollScreen>
  );
}
