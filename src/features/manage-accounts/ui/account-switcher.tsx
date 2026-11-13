import Check from 'lucide-react-native/icons/check';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { balanceOf, useAccountBalancesStore } from '@/entities/account';
import { NATIVE_ASSET } from '@/entities/asset';
import {
  AccountBadge,
  isWalletUsable,
  selectUsableAccounts,
  useAccountLabel,
  useActiveAccount,
  useWalletLabel,
  useWalletStore,
  type WalletAccount,
} from '@/entities/wallet';
import { shortenAddress } from '@/shared/lib';
import { useAmountDisplay } from '@/shared/model';
import { ICON_SIZE, ListRow, ListSection, Text, useThemeColors } from '@/shared/ui';

import { switchToAccount } from '../model/accounts';

type AccountSwitcherProps = {
  /** Called after a pick: the sheet closes. */
  onDone: () => void;
};

const ROW_BADGE_SIZE = 36;

function useBalanceText(): (account: WalletAccount) => string | undefined {
  const { formatBalance } = useAmountDisplay();
  const balances = useAccountBalancesStore((state) => state.balances);
  return (account) => {
    const { wei } = balanceOf(balances, account.address);
    if (wei === null) return undefined;
    return `${formatBalance(wei, NATIVE_ASSET.decimals)} ${NATIVE_ASSET.symbol}`;
  };
}

/**
 * Picks the account to send from: the accounts of every usable wallet, grouped by wallet (D-78),
 * each with its balance. The account in use stays at the top, outside the list, so it and the
 * first rows are visible however long the list is; only the list scrolls.
 */
export function AccountSwitcher({ onDone }: AccountSwitcherProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const accountLabel = useAccountLabel();
  const walletLabel = useWalletLabel();
  const balanceText = useBalanceText();
  const wallets = useWalletStore((state) => state.wallets);
  const active = useActiveAccount();

  useEffect(() => {
    const addresses = selectUsableAccounts(useWalletStore.getState().wallets).map(
      (account) => account.address,
    );
    void useAccountBalancesStore.getState().refresh(addresses);
  }, []);

  return (
    <View className="flex-1 gap-4">
      <Text variant="heading" accessibilityRole="header">
        {t('accounts.switcher.title')}
      </Text>
      {active ? (
        <ListSection title={t('accounts.switcher.current')}>
          <ListRow
            leading={<AccountBadge account={active} size={ROW_BADGE_SIZE} />}
            title={accountLabel(active)}
            description={shortenAddress(active.address)}
            value={balanceText(active)}
          />
        </ListSection>
      ) : null}
      <ScrollView
        testID="account-switcher-list"
        className="flex-1"
        contentContainerClassName="gap-4 pb-6"
      >
        {wallets.filter(isWalletUsable).map((wallet) => (
          <ListSection key={wallet.id} title={walletLabel(wallet)}>
            {wallet.accounts.map((account) => {
              const isActive = active?.walletId === wallet.id && active.index === account.index;
              return (
                <ListRow
                  key={account.index}
                  leading={<AccountBadge account={account} size={ROW_BADGE_SIZE} />}
                  title={accountLabel(account)}
                  description={shortenAddress(account.address)}
                  value={balanceText(account)}
                  trailing={
                    isActive ? (
                      <Check size={ICON_SIZE.md} color={colors.accent.DEFAULT} />
                    ) : (
                      <View className="w-5" />
                    )
                  }
                  onPress={() => {
                    switchToAccount({ walletId: wallet.id, index: account.index });
                    onDone();
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isActive }}
                />
              );
            })}
          </ListSection>
        ))}
      </ScrollView>
    </View>
  );
}
