import { router, useIsFocused } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl } from 'react-native';

import { useAccountBalancesStore } from '@/entities/account';
import { useHistoryStore } from '@/entities/transaction';
import { isWalletUsable, selectUsableAccounts, useWalletStore } from '@/entities/wallet';
import { DefaultMovedNotice, switchToAccount } from '@/features/manage-accounts';
import { ROUTES } from '@/shared/config';
import { Notice, ScrollScreen, useThemeColors } from '@/shared/ui';
import { RecentActivity } from '@/widgets/history-list';
import { AccountCarousel, type AccountRef } from '@/widgets/wallet-grid';

import { HomeHeader } from './home-header';
import { QuickActions } from './quick-actions';

function openAccount(account: AccountRef) {
  // Its screen shows the account in use; the default account stays what it is.
  switchToAccount(account);
  router.push({ pathname: ROUTES.walletDetail, params: account });
}

/**
 * Home: every account at a glance. A carousel of account cards, Transfer and Scan QR, and the
 * newest activity of all accounts. Pulling down reloads every balance and the activity.
 */
export function HomePage() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const isFocused = useIsFocused();
  const wallets = useWalletStore((state) => state.wallets);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = async () => {
    setIsRefreshing(true);
    // The activity card reloads by itself once what was found is forgotten.
    useHistoryStore.getState().reset();
    const addresses = selectUsableAccounts(wallets).map((account) => account.address);
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
      <HomeHeader />
      {wallets.every(isWalletUsable) ? null : <Notice tone="warning">{t('home.attention')}</Notice>}
      <DefaultMovedNotice />
      <AccountCarousel
        isFocused={isFocused}
        onOpenAccount={openAccount}
        onAccountMenu={(account) => router.push({ pathname: ROUTES.accountMenu, params: account })}
        onAdd={() => router.push(ROUTES.walletAdd)}
      />
      <QuickActions enterIndex={1} />
      <RecentActivity enterIndex={2} onSeeAll={() => router.navigate(ROUTES.history)} />
    </ScrollScreen>
  );
}
