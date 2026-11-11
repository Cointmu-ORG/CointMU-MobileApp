import { router } from 'expo-router';
import Inbox from 'lucide-react-native/icons/inbox';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { findAsset } from '@/entities/asset';
import { TxStatusBadge, useTxStore, type LocalTxRecord } from '@/entities/transaction';
import { useWalletStore } from '@/entities/wallet';
import { ROUTES } from '@/shared/config';
import { isSameAddress, shortenAddress } from '@/shared/lib';
import { useAmountDisplay } from '@/shared/model';
import { Card, PressableSurface, SURFACE_PALETTE, Text, useThemeColors } from '@/shared/ui';

const RECENT_LIMIT = 5;
const EMPTY_ICON_SIZE = 32;

function TxRow({ record }: { record: LocalTxRecord }) {
  const { t } = useTranslation();
  const { formatBalance } = useAmountDisplay();
  const asset = findAsset(record.assetKey);
  const amount = asset
    ? `-${formatBalance(BigInt(record.value), asset.decimals)} ${asset.symbol}`
    : t('tx.unknownAsset');
  const recipient = shortenAddress(record.to);
  return (
    <PressableSurface
      palette={SURFACE_PALETTE.row}
      className="flex-row items-center justify-between gap-3 rounded-control py-2"
      onPress={() => router.push({ pathname: ROUTES.txDetail, params: { hash: record.hash } })}
      accessibilityRole="button"
      accessibilityLabel={t('tx.rowLabel', { amount, address: recipient })}
    >
      <View className="flex-1 gap-1">
        <Text variant="label">{t('tx.direction.out')}</Text>
        <Text variant="mono" tone="secondary">
          {recipient}
        </Text>
      </View>
      <View className="items-end gap-1">
        <Text variant="label">{amount}</Text>
        <TxStatusBadge status={record.status} confirmations={record.confirmations} />
      </View>
    </PressableSurface>
  );
}

function EmptyState() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  return (
    <View className="items-center gap-2 py-6">
      <Inbox size={EMPTY_ICON_SIZE} color={colors.content.secondary} />
      <Text variant="label">{t('home.transactions.empty')}</Text>
      <Text variant="caption" tone="secondary" className="text-center">
        {t('home.transactions.emptyHint')}
      </Text>
    </View>
  );
}

/** The active account's latest sends from this app, with live status. */
export function TxList({ enterIndex = 0 }: { enterIndex?: number }) {
  const { t } = useTranslation();
  const address = useWalletStore((state) => state.address);
  const records = useTxStore((state) => state.records);
  const recent = records
    .filter((record) => address !== null && isSameAddress(record.from, address))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, RECENT_LIMIT);

  return (
    <Card enterIndex={enterIndex} className="gap-2">
      <Text variant="heading" accessibilityRole="header">
        {t('home.transactions.title')}
      </Text>
      {recent.length === 0 ? (
        <EmptyState />
      ) : (
        recent.map((record) => <TxRow key={record.hash} record={record} />)
      )}
    </Card>
  );
}
