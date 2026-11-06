import Inbox from 'lucide-react-native/icons/inbox';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { NATIVE_ASSET } from '@/entities/asset';
import { useTxStore, type LocalTxRecord } from '@/entities/transaction';
import { AMOUNT_DISPLAY_FRACTION_DIGITS } from '@/shared/config';
import { formatAmount, shortenAddress } from '@/shared/lib';
import { Card, colors, Text } from '@/shared/ui';

const RECENT_LIMIT = 5;
const EMPTY_ICON_SIZE = 32;

function TxRow({ record }: { record: LocalTxRecord }) {
  const { t, i18n } = useTranslation();
  // ponytail: native CMU only; look up the asset by record.assetKey once ERC-20 sends exist.
  const amount = formatAmount(BigInt(record.value), NATIVE_ASSET.decimals, {
    locale: i18n.language,
    maxFractionDigits: AMOUNT_DISPLAY_FRACTION_DIGITS,
  });
  return (
    <View className="flex-row items-center justify-between py-2">
      <View>
        <Text variant="label">{t('home.transactions.sent')}</Text>
        <Text variant="mono" tone="secondary">
          {shortenAddress(record.to)}
        </Text>
      </View>
      <View className="items-end">
        <Text variant="label">{`-${amount} ${NATIVE_ASSET.symbol}`}</Text>
        <Text variant="caption" tone="secondary">
          {t(`home.transactions.status.${record.status}`)}
        </Text>
      </View>
    </View>
  );
}

function EmptyState() {
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

export function TxList({ enterIndex = 0 }: { enterIndex?: number }) {
  const { t } = useTranslation();
  const records = useTxStore((state) => state.records);
  const recent = [...records].sort((a, b) => b.createdAt - a.createdAt).slice(0, RECENT_LIMIT);

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
