import { useLocalSearchParams } from 'expo-router';
import ArrowDownLeft from 'lucide-react-native/icons/arrow-down-left';
import ArrowLeftRight from 'lucide-react-native/icons/arrow-left-right';
import ArrowUpRight from 'lucide-react-native/icons/arrow-up-right';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { findAsset, NATIVE_ASSET } from '@/entities/asset';
import { getProvider } from '@/entities/network';
import { fetchTxFee, TxStatusBadge, type HistoryItem } from '@/entities/transaction';
import { AddressLabel, useAccountByAddress, useAccountLabel } from '@/entities/wallet';
import { formatDateTime, logger, shortenAddress } from '@/shared/lib';
import { useAmountDisplay, useAppearanceStore } from '@/shared/model';
import { DetailRow, FormScreen, ICON_SIZE, Text, useThemeColors } from '@/shared/ui';

import { TxTechnical } from './tx-technical';
import { useHistoryItem } from './use-history-item';

const DIRECTION_ICON = { in: ArrowDownLeft, out: ArrowUpRight, self: ArrowLeftRight } as const;
const DIRECTION_TITLE = {
  in: 'history.detail.titleIn',
  out: 'history.detail.titleOut',
  self: 'history.detail.titleSelf',
} as const;

/**
 * The fee actually paid, read from the receipt once the tx is mined. The send receipt has the
 * same hook: two copies, below the rule of three.
 */
function usePaidFee(item: HistoryItem): bigint | null {
  const [fee, setFee] = useState<bigint | null>(null);
  const { hash } = item;
  const isMined = item.blockNumber !== null;
  useEffect(() => {
    if (!isMined) return;
    fetchTxFee(getProvider(), hash)
      .then(setFee)
      .catch((error: unknown) => logger.warn('Reading the tx fee failed', { error }));
  }, [hash, isMined]);
  return fee;
}

/** "Sent to Account 2", "Received from 0xA1dd…1Eef": the other side by name when it is ours. */
function useTitle(item: HistoryItem): string {
  const { t } = useTranslation();
  const counterparty = item.direction === 'in' ? item.from : item.to;
  const account = useAccountByAddress(counterparty);
  const labelOf = useAccountLabel();
  const name = account ? labelOf(account) : shortenAddress(counterparty);
  return t(DIRECTION_TITLE[item.direction], { name });
}

/** Direction icon, a human title, the amount large, the status in plain words and what it means. */
function Summary({ item }: { item: HistoryItem }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { formatBalance } = useAmountDisplay();
  const title = useTitle(item);
  const asset = findAsset(item.assetKey);
  const Icon = DIRECTION_ICON[item.direction];
  return (
    <View className="items-center gap-3">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-50">
        <Icon size={ICON_SIZE.lg} color={colors.accent.DEFAULT} />
      </View>
      <Text variant="heading" accessibilityRole="header" className="text-center">
        {title}
      </Text>
      {asset ? (
        <View className="flex-row flex-wrap items-baseline justify-center gap-2">
          <Text variant="amount">{formatBalance(BigInt(item.value), asset.decimals)}</Text>
          <Text variant="heading" tone="secondary">
            {asset.symbol}
          </Text>
        </View>
      ) : (
        <Text tone="secondary">{t('tx.unknownAsset')}</Text>
      )}
      <View className="items-center">
        <TxStatusBadge status={item.status} />
      </View>
      <Text tone="secondary" className="text-center">
        {t(`tx.statusHelp.${item.status}`)}
      </Text>
    </View>
  );
}

function MainRows({ item }: { item: HistoryItem }) {
  const { t, i18n } = useTranslation();
  const fee = usePaidFee(item);
  const { formatExact } = useAmountDisplay();
  const timeFormat = useAppearanceStore((state) => state.timeFormat);
  return (
    <View className="rounded-card border border-border bg-surface-card px-4 py-3">
      <DetailRow label={t('tx.details.from')}>
        <AddressLabel address={item.from} label={t('tx.details.from')} />
      </DetailRow>
      <DetailRow label={t('tx.details.to')}>
        <AddressLabel address={item.to} label={t('tx.details.to')} />
      </DetailRow>
      <DetailRow label={t('tx.details.date')}>
        {formatDateTime(item.timestamp, i18n.language, timeFormat)}
      </DetailRow>
      <DetailRow label={t('tx.details.fee')}>
        {fee === null
          ? t('tx.details.feeUnknown')
          : `${formatExact(fee, NATIVE_ASSET.decimals)} ${NATIVE_ASSET.symbol}`}
      </DetailRow>
      <DetailRow label={t('tx.details.status')}>
        <TxStatusBadge status={item.status} />
      </DetailRow>
    </View>
  );
}

/** One transaction, readable without knowing what a block is; the rest is in Technical details. */
export function TxDetailPage() {
  const { t } = useTranslation();
  const { hash, owner } = useLocalSearchParams<{ hash: string; owner?: string }>();
  const item = useHistoryItem(hash ?? '', owner);
  if (item === null) {
    return (
      <FormScreen>
        <Text tone="secondary">{t('history.detail.missing')}</Text>
      </FormScreen>
    );
  }
  return (
    <FormScreen>
      <Summary item={item} />
      <MainRows item={item} />
      <TxTechnical item={item} />
    </FormScreen>
  );
}
