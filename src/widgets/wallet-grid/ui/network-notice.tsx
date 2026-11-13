import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { balanceOf, useAccountBalancesStore } from '@/entities/account';
import { Button, Notice } from '@/shared/ui';

/**
 * Shown when no balance could be loaded at all: the node is unreachable, not one account. One
 * banner with a retry instead of an error on every card.
 */
export function NetworkNotice({ addresses }: { addresses: readonly string[] }) {
  const { t } = useTranslation();
  const balances = useAccountBalancesStore((state) => state.balances);
  const isNetworkDown =
    addresses.length > 0 &&
    addresses.every((address) => balanceOf(balances, address).status === 'error');
  if (!isNetworkDown) return null;

  return (
    <View className="gap-3">
      <Notice tone="danger">{t('wallets.error.network')}</Notice>
      <Button
        variant="secondary"
        label={t('wallets.error.retry')}
        onPress={() => void useAccountBalancesStore.getState().refresh(addresses)}
      />
    </View>
  );
}
