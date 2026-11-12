import Check from 'lucide-react-native/icons/check';
import LayoutGrid from 'lucide-react-native/icons/layout-grid';
import Plus from 'lucide-react-native/icons/plus';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useBalanceStore } from '@/entities/account';
import { NATIVE_ASSET } from '@/entities/asset';
import {
  isWalletUsable,
  useAccountLabel,
  useActiveAccount,
  useWalletLabel,
  useWalletStore,
} from '@/entities/wallet';
import { shortenAddress } from '@/shared/lib';
import { useAmountDisplay } from '@/shared/model';
import { ICON_SIZE, ListRow, ListSection, Text, useThemeColors } from '@/shared/ui';

import { switchToAccount } from '../model/accounts';

type AccountSwitcherProps = {
  /** Called after a switch: the sheet closes. */
  onDone: () => void;
  /** Opens the "add" sheet (account, new wallet, import). */
  onAdd: () => void;
  /** Opens the Wallets tab (rename, color, receive). */
  onManage: () => void;
};

/** Only the active account's balance is loaded here; other rows show none. */
function useActiveBalanceText(): string | undefined {
  const { formatBalance } = useAmountDisplay();
  const wei = useBalanceStore((state) => state.wei);
  if (wei === null) return undefined;
  return `${formatBalance(wei, NATIVE_ASSET.decimals)} ${NATIVE_ASSET.symbol}`;
}

/**
 * Quick account switcher for the home sheet: the accounts of every usable wallet, grouped by
 * wallet (D-78). Pick one, or open the add sheet or the Wallets tab.
 */
export function AccountSwitcher({ onDone, onAdd, onManage }: AccountSwitcherProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const accountLabel = useAccountLabel();
  const walletLabel = useWalletLabel();
  const wallets = useWalletStore((state) => state.wallets);
  const active = useActiveAccount();
  const activeBalance = useActiveBalanceText();

  return (
    <View className="gap-4">
      <Text variant="heading" accessibilityRole="header">
        {t('accounts.switcher.title')}
      </Text>
      {wallets.filter(isWalletUsable).map((wallet) => (
        <ListSection key={wallet.id} title={walletLabel(wallet)}>
          {wallet.accounts.map((account) => {
            const isActive = active?.walletId === wallet.id && active.index === account.index;
            return (
              <ListRow
                key={account.index}
                title={accountLabel(account)}
                description={shortenAddress(account.address)}
                value={isActive ? activeBalance : undefined}
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
      <ListSection>
        <ListRow title={t('accounts.switcher.add')} icon={Plus} onPress={onAdd} />
        <ListRow
          title={t('accounts.switcher.manage')}
          description={t('accounts.switcher.manageHint')}
          icon={LayoutGrid}
          onPress={onManage}
        />
      </ListSection>
    </View>
  );
}
