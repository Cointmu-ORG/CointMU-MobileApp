import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { TX_POLICY, useTxStore, type HistoryItem } from '@/entities/transaction';
import { explorerTxUrl } from '@/shared/config';
import { formatUrlHost, shortenAddress } from '@/shared/lib';
import { Button, CopyValue, DetailRow, Disclosure, Text } from '@/shared/ui';

function FullValue({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1 py-1">
      <Text variant="label" tone="secondary">
        {label}
      </Text>
      <Text variant="mono" selectable>
        {value}
      </Text>
    </View>
  );
}

/**
 * Collapsed by default: full addresses, block, confirmations as "n of 12", the transaction ID
 * with copy, the node a transfer sent from this app went through, and the explorer link if set.
 */
export function TxTechnical({ item }: { item: HistoryItem }) {
  const { t } = useTranslation();
  const node = useTxStore(
    (state) => state.records.find((record) => record.hash === item.hash)?.node ?? null,
  );
  const link = explorerTxUrl(item.hash);
  return (
    <Disclosure title={t('tx.details.technical')}>
      <View className="gap-1 rounded-card border border-border bg-surface-card px-4 py-3">
        <FullValue label={t('tx.details.fromFull')} value={item.from} />
        <FullValue label={t('tx.details.toFull')} value={item.to} />
        <DetailRow label={t('tx.details.block')}>
          {item.blockNumber === null ? t('tx.details.notInBlock') : String(item.blockNumber)}
        </DetailRow>
        <DetailRow label={t('tx.details.confirmations')}>
          {t('tx.details.confirmationsValue', {
            count: Math.min(item.confirmations, TX_POLICY.finalConfirmations),
            total: TX_POLICY.finalConfirmations,
          })}
        </DetailRow>
        <DetailRow label={t('tx.details.hash')}>
          <CopyValue value={item.hash} accessibilityLabel={t('tx.details.hash')}>
            <Text variant="mono">{shortenAddress(item.hash)}</Text>
          </CopyValue>
        </DetailRow>
        <Text variant="mono" tone="secondary" selectable>
          {item.hash}
        </Text>
        {node ? <DetailRow label={t('tx.details.node')}>{formatUrlHost(node)}</DetailRow> : null}
        {link ? (
          <Button
            variant="ghost"
            label={t('tx.details.explorer')}
            onPress={() => void Linking.openURL(link)}
          />
        ) : null}
      </View>
    </Disclosure>
  );
}
