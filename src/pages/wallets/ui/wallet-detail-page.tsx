import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';

import { useAccountBalancesStore, useBalanceStore } from '@/entities/account';
import { useHistoryStore } from '@/entities/transaction';
import { useAccountLabel, useActiveAccount } from '@/entities/wallet';
import { switchToAccount } from '@/features/manage-accounts';
import { ROUTES } from '@/shared/config';
import { FormScreen, useThemeColors } from '@/shared/ui';
import { AssetList } from '@/widgets/asset-list';
import { BalanceCard } from '@/widgets/balance-card';
import { RecentActivity } from '@/widgets/history-list';

import { DetailActions } from './detail-actions';

/**
 * One account in full: balance, Send / Receive / Scan, its tokens and its activity, and the
 * "…" menu. While it is in front its account is the one in use, which is what the balance card,
 * the token list and a send started here read; nothing is drawn until that is so, so another
 * account's numbers never show here. The default account is never changed by looking (D-92).
 * A wallet that cannot be used shows nothing.
 */
export function WalletDetailPage() {
  const colors = useThemeColors();
  const labelOf = useAccountLabel();
  const { walletId, index } = useLocalSearchParams<{ walletId?: string; index?: string }>();
  const accountIndex = Number(index);
  const active = useActiveAccount();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // On every return too: a send started here may have used another source for that send.
  useFocusEffect(
    useCallback(() => {
      if (walletId !== undefined && Number.isInteger(accountIndex)) {
        switchToAccount({ walletId, index: accountIndex });
      }
    }, [walletId, accountIndex]),
  );

  if (active === null || active.walletId !== walletId || active.index !== accountIndex) return null;
  const account = { walletId: active.walletId, index: active.index };

  const refresh = async () => {
    setIsRefreshing(true);
    useHistoryStore.getState().reset();
    await Promise.all([
      useBalanceStore.getState().refresh(active.address),
      useAccountBalancesStore.getState().refresh([active.address]),
    ]);
    setIsRefreshing(false);
  };

  return (
    <FormScreen
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void refresh()}
          tintColor={colors.accent.DEFAULT}
          colors={[colors.accent.DEFAULT]}
        />
      }
    >
      <Stack.Screen options={{ headerTitle: labelOf(active) }} />
      <BalanceCard
        enterIndex={0}
        onMenu={() => router.push({ pathname: ROUTES.accountMenu, params: account })}
      />
      <DetailActions account={account} />
      <AssetList enterIndex={1} />
      <RecentActivity
        owner={active.address}
        enterIndex={2}
        onSeeAll={() =>
          router.dismissTo({ pathname: ROUTES.history, params: { owner: active.address } })
        }
      />
    </FormScreen>
  );
}
