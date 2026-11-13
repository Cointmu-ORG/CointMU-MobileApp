import { router } from 'expo-router';
import ArrowDownLeft from 'lucide-react-native/icons/arrow-down-left';
import ArrowLeftRight from 'lucide-react-native/icons/arrow-left-right';
import ArrowUpRight from 'lucide-react-native/icons/arrow-up-right';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { findAsset } from '@/entities/asset';
import { TxStatusBadge, type HistoryItem } from '@/entities/transaction';
import { AccountBadge, useAccountLabel, type WalletAccount } from '@/entities/wallet';
import { ROUTES } from '@/shared/config';
import { formatTime, shortenAddress } from '@/shared/lib';
import { useAmountDisplay, useAppearanceStore } from '@/shared/model';
import { ICON_SIZE, PressableSurface, SURFACE_PALETTE, Text, useThemeColors } from '@/shared/ui';

const DIRECTION = {
  in: { Icon: ArrowDownLeft, sign: '+' },
  out: { Icon: ArrowUpRight, sign: '-' },
  self: { Icon: ArrowLeftRight, sign: '' },
} as const;
const ACCOUNT_BADGE_SIZE = 18;

type HistoryRowProps = {
  item: HistoryItem;
  /** The own account the row belongs to; shown by icon and name. Left out on that account's own screen. */
  account?: WalletAccount;
};

/** One transaction: direction, the account it belongs to, counterparty, signed amount, status and time. */
export function HistoryRow({ item, account }: HistoryRowProps) {
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const { formatBalance } = useAmountDisplay();
  const labelOf = useAccountLabel();
  const timeFormat = useAppearanceStore((state) => state.timeFormat);
  const { Icon, sign } = DIRECTION[item.direction];
  const asset = findAsset(item.assetKey);
  const amount = asset
    ? `${sign}${formatBalance(BigInt(item.value), asset.decimals)} ${asset.symbol}`
    : t('tx.unknownAsset');
  const counterparty = shortenAddress(item.direction === 'in' ? item.from : item.to);
  const time = formatTime(item.timestamp, i18n.language, timeFormat);
  const labelValues = {
    direction: t(`tx.direction.${item.direction}`),
    amount,
    address: counterparty,
    status: t(`tx.status.${item.status}`),
  };

  return (
    <PressableSurface
      palette={SURFACE_PALETTE.row}
      className="min-h-16 flex-row items-center gap-3 rounded-control px-3 py-3"
      onPress={() =>
        router.push({ pathname: ROUTES.txDetail, params: { hash: item.hash, owner: item.owner } })
      }
      accessibilityRole="button"
      accessibilityLabel={
        account
          ? t('history.rowLabelAccount', { ...labelValues, account: labelOf(account) })
          : t('history.rowLabel', labelValues)
      }
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-50">
        <Icon size={ICON_SIZE.md} color={colors.accent.DEFAULT} />
      </View>
      <View className="flex-1 gap-1">
        <Text variant="label">{t(`tx.direction.${item.direction}`)}</Text>
        {account ? (
          <View className="flex-row items-center gap-1.5">
            <AccountBadge account={account} size={ACCOUNT_BADGE_SIZE} />
            <Text variant="caption" className="flex-1" numberOfLines={1}>
              {labelOf(account)}
            </Text>
          </View>
        ) : null}
        <Text variant="mono" tone="secondary">
          {counterparty}
        </Text>
      </View>
      <View className="items-end gap-1">
        <Text variant="label" tone={item.direction === 'in' ? 'success' : 'default'}>
          {amount}
        </Text>
        <TxStatusBadge status={item.status} confirmations={item.confirmations} />
        <Text variant="caption" tone="secondary">
          {time}
        </Text>
      </View>
    </PressableSurface>
  );
}
