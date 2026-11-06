import { useState } from 'react';
import { RefreshControl } from 'react-native';

import { useBalanceStore } from '@/entities/account';
import { useWalletStore } from '@/entities/wallet';
import { AssetList } from '@/widgets/asset-list';
import { BalanceCard } from '@/widgets/balance-card';
import { TxList } from '@/widgets/tx-list';
import { colors, ScrollScreen } from '@/shared/ui';

import { QuickActions } from './quick-actions';

export function HomePage() {
  const address = useWalletStore((state) => state.address);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = async () => {
    if (address === null) return;
    setIsRefreshing(true);
    await useBalanceStore.getState().refresh(address);
    setIsRefreshing(false);
  };

  return (
    <ScrollScreen
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void refresh()}
          tintColor={colors.primary[600]}
          colors={[colors.primary[600]]}
        />
      }
    >
      <BalanceCard enterIndex={0} />
      <QuickActions enterIndex={1} />
      <AssetList enterIndex={2} />
      <TxList enterIndex={3} />
    </ScrollScreen>
  );
}
