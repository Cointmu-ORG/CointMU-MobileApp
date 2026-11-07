import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { findAsset, NATIVE_ASSET } from '@/entities/asset';
import { getProvider } from '@/entities/network';
import { fetchTxFee, TX_POLICY, TxStatusBadge, type HistoryItem } from '@/entities/transaction';
import { explorerTxUrl } from '@/shared/config';
import { formatAmount, formatDateTime, logger } from '@/shared/lib';
import { Button, Card, FormScreen, Text } from '@/shared/ui';

import { useHistoryItem } from './use-history-item';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-1 border-b border-border py-3">
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      {children}
    </View>
  );
}

/** The fee actually paid, read from the receipt once the tx is mined. */
function usePaidFee(item: HistoryItem | null): bigint | null {
  const [fee, setFee] = useState<bigint | null>(null);
  const hash = item?.hash;
  const isMined = item?.blockNumber !== null && item?.blockNumber !== undefined;
  useEffect(() => {
    if (!hash || !isMined) return;
    fetchTxFee(getProvider(), hash)
      .then(setFee)
      .catch((error: unknown) => logger.warn('Reading the tx fee failed', { error }));
  }, [hash, isMined]);
  return fee;
}

function Details({ item }: { item: HistoryItem }) {
  const { t, i18n } = useTranslation();
  const fee = usePaidFee(item);
  const asset = findAsset(item.assetKey);
  const exact = (value: bigint, decimals: number) =>
    formatAmount(value, decimals, { locale: i18n.language, maxFractionDigits: decimals });
  const amount = asset
    ? `${exact(BigInt(item.value), asset.decimals)} ${asset.symbol}`
    : t('tx.unknownAsset');
  return (
    <Card className="gap-0">
      <Row label={t('history.detail.amount')}>
        <Text variant="heading">{amount}</Text>
      </Row>
      <Row label={t('history.detail.from')}>
        <Text variant="mono" selectable>
          {item.from}
        </Text>
      </Row>
      <Row label={t('history.detail.to')}>
        <Text variant="mono" selectable>
          {item.to}
        </Text>
      </Row>
      <Row label={t('history.detail.date')}>
        <Text>{formatDateTime(item.timestamp, i18n.language)}</Text>
      </Row>
      <Row label={t('history.detail.block')}>
        <Text>
          {item.blockNumber === null ? t('history.detail.notMined') : String(item.blockNumber)}
        </Text>
      </Row>
      <Row label={t('history.detail.confirmations')}>
        <Text>
          {t('history.detail.confirmationsValue', {
            count: item.confirmations,
            total: TX_POLICY.finalConfirmations,
          })}
        </Text>
      </Row>
      <Row label={t('history.detail.fee')}>
        <Text>
          {fee === null
            ? t('history.detail.feeUnknown')
            : `${exact(fee, NATIVE_ASSET.decimals)} ${NATIVE_ASSET.symbol}`}
        </Text>
      </Row>
      <Row label={t('history.detail.hash')}>
        <Text variant="mono" selectable>
          {item.hash}
        </Text>
      </Row>
    </Card>
  );
}

export function TxDetailPage() {
  const { t } = useTranslation();
  const { hash } = useLocalSearchParams<{ hash: string }>();
  const item = useHistoryItem(hash ?? '');
  if (item === null) {
    return (
      <FormScreen>
        <Text tone="secondary">{t('history.detail.missing')}</Text>
      </FormScreen>
    );
  }
  const link = explorerTxUrl(item.hash);
  return (
    <FormScreen>
      <View className="gap-2">
        <Text variant="title" accessibilityRole="header">
          {t(`tx.direction.${item.direction}`)}
        </Text>
        <TxStatusBadge status={item.status} confirmations={item.confirmations} />
        <Text tone="secondary">
          {t(`tx.statusHelp.${item.status}`, { total: TX_POLICY.finalConfirmations })}
        </Text>
      </View>
      <Details item={item} />
      {link ? (
        <Button
          variant="secondary"
          label={t('history.detail.explorer')}
          onPress={() => void Linking.openURL(link)}
        />
      ) : null}
    </FormScreen>
  );
}
