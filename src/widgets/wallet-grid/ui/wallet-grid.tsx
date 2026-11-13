import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useUsableAccounts, useWalletStore } from '@/entities/wallet';
import { Button, Text } from '@/shared/ui';

import type { WalletGridActions } from '../model/types';
import { useAccountBalances } from '../model/use-account-balances';
import { NetworkNotice } from './network-notice';
import { WalletSection } from './wallet-section';

type WalletGridProps = {
  actions: WalletGridActions;
  /** Balances poll only while the tab is shown. */
  isFocused?: boolean;
};

/**
 * Every account of every wallet as a grid of cards, grouped by wallet (D-80). Cards show a
 * placeholder while their balance loads; a banner with a retry explains an unreachable network;
 * a wallet that cannot be used shows what to do instead of its cards.
 */
export function WalletGrid({ actions, isFocused = true }: WalletGridProps) {
  const { t } = useTranslation();
  const wallets = useWalletStore((state) => state.wallets);
  const addresses = useUsableAccounts().map((account) => account.address);
  useAccountBalances(addresses, isFocused);

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
      <NetworkNotice addresses={addresses} />
      {wallets.map((wallet) => (
        <WalletSection key={wallet.id} wallet={wallet} actions={actions} />
      ))}
    </View>
  );
}
