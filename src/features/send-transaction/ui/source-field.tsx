import ChevronDown from 'lucide-react-native/icons/chevron-down';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useBalanceStore } from '@/entities/account';
import { NATIVE_ASSET } from '@/entities/asset';
import { AccountBadge, useAccountLabel, type WalletAccount } from '@/entities/wallet';
import { shortenAddress } from '@/shared/lib';
import { COMPACT_BALANCE_LENGTH, useAmountDisplay } from '@/shared/model';
import { ICON_SIZE, PressableSurface, SURFACE_PALETTE, Text, useThemeColors } from '@/shared/ui';

const BADGE_SIZE = 40;

type SourceFieldProps = {
  account: WalletAccount;
  /** Opens the account picker. */
  onPress: () => void;
};

/**
 * "From": the account this transfer is sent from, with its CMU balance, and the way to pick
 * another one. The balance is exact, like every amount in the send flow.
 */
export function SourceField({ account, onPress }: SourceFieldProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const labelOf = useAccountLabel();
  const { formatBalance } = useAmountDisplay();
  const wei = useBalanceStore((state) => state.wei);
  const name = labelOf(account);
  // The same balance as the picker sheet and the cards: Settings > Display decimals.
  const balance =
    wei === null
      ? t('send.form.balanceLoading')
      : `${formatBalance(wei, NATIVE_ASSET.decimals, COMPACT_BALANCE_LENGTH)} ${NATIVE_ASSET.symbol}`;

  return (
    <View className="gap-2">
      <Text variant="label" tone="secondary">
        {t('send.form.from')}
      </Text>
      <PressableSurface
        palette={SURFACE_PALETTE.secondary}
        className="min-h-16 flex-row items-center gap-3 rounded-control px-4 py-3"
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('send.form.fromLabel', { name, balance })}
        accessibilityHint={t('send.form.fromHint')}
      >
        <AccountBadge account={account} size={BADGE_SIZE} />
        <View className="flex-1 gap-0.5">
          <Text variant="label" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" tone="secondary">
            {shortenAddress(account.address)}
          </Text>
        </View>
        <Text variant="label">{balance}</Text>
        <ChevronDown size={ICON_SIZE.md} color={colors.content.secondary} />
      </PressableSurface>
    </View>
  );
}
