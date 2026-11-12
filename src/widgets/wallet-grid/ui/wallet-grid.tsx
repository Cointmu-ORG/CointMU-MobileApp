import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { balanceOf, useAccountBalancesStore } from '@/entities/account';
import { isWalletUsable, useWalletStore, type WalletRecord } from '@/entities/wallet';
import { Button, Notice, Text } from '@/shared/ui';

import type { WalletGridActions } from '../model/types';
import { useAccountBalances } from '../model/use-account-balances';
import { WalletSection } from './wallet-section';

type WalletGridProps = {
  actions: WalletGridActions;
  /** Balances poll only while the tab is shown. */
  isFocused?: boolean;
};

function usableAddresses(wallets: readonly WalletRecord[]): string[] {
  return wallets
    .filter(isWalletUsable)
    .flatMap((wallet) => wallet.accounts.map((account) => account.address));
}

/** True when no balance could be loaded at all: the node is unreachable, not one account. */
function useIsNetworkDown(addresses: readonly string[]): boolean {
  const balances = useAccountBalancesStore((state) => state.balances);
  return (
    addresses.length > 0 &&
    addresses.every((address) => balanceOf(balances, address).status === 'error')
  );
}

/**
 * Every account of every wallet as a grid of cards, grouped by wallet (D-80). Cards show a
 * placeholder while their balance loads; a banner with a retry explains an unreachable network;
 * a wallet that cannot be used shows what to do instead of its cards.
 */
export function WalletGrid({ actions, isFocused = true }: WalletGridProps) {
  const { t } = useTranslation();
  const wallets = useWalletStore((state) => state.wallets);
  const addresses = usableAddresses(wallets);
  useAccountBalances(addresses, isFocused);
  const isNetworkDown = useIsNetworkDown(addresses);

  if (wallets.length === 0) {
    return (
      <View className="items-center gap-3 py-10">
        <Text variant="heading" className="text-center">
          {t('wallets.empty.title')}
        </Text>
        <Text tone="secondary" className="text-center">
          {t('wallets.empty.body')}
        </Text>
        <Button label={t('wallets.empty.action')} onPress={actions.onAdd} />
      </View>
    );
  }

  return (
    <View className="gap-6">
      {isNetworkDown ? (
        <View className="gap-3">
          <Notice tone="danger">{t('wallets.error.network')}</Notice>
          <Button
            variant="secondary"
            label={t('wallets.error.retry')}
            onPress={() => void useAccountBalancesStore.getState().refresh(addresses)}
          />
        </View>
      ) : null}
      {wallets.map((wallet) => (
        <WalletSection key={wallet.id} wallet={wallet} actions={actions} />
      ))}
    </View>
  );
}
