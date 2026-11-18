import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { TX_POLICY, type LocalTxRecord } from '@/entities/transaction';
import { explorerTxUrl } from '@/shared/config';
import { formatUrlHost, shortenAddress } from '@/shared/lib';
import { Button, CopyValue, DetailRow, Disclosure, Text } from '@/shared/ui';

/**
 * What only a technical reader needs, collapsed by default: the transaction ID, the block, the
 * confirmations as "n of 12", the node that took it and the explorer link when one is set.
 */
export function ReceiptTechnical({ hash, record }: { hash: string; record: LocalTxRecord | null }) {
  const { t } = useTranslation();
  const link = explorerTxUrl(hash);
  return (
    <Disclosure title={t('tx.details.technical')}>
      <View className="gap-1 rounded-card border border-border bg-surface-card px-4 py-3">
        <DetailRow label={t('tx.details.hash')}>
          <CopyValue value={hash} accessibilityLabel={t('tx.details.hash')}>
            <Text variant="mono">{shortenAddress(hash)}</Text>
          </CopyValue>
        </DetailRow>
        <Text variant="mono" tone="secondary" selectable>
          {hash}
        </Text>
        {record ? (
          <>
            <DetailRow label={t('tx.details.confirmations')}>
              {t('tx.details.confirmationsValue', {
                count: Math.min(record.confirmations, TX_POLICY.finalConfirmations),
                total: TX_POLICY.finalConfirmations,
              })}
            </DetailRow>
            <DetailRow label={t('tx.details.block')}>
              {record.blockNumber === null
                ? t('tx.details.notInBlock')
                : String(record.blockNumber)}
            </DetailRow>
            <DetailRow label={t('tx.details.node')}>{formatUrlHost(record.node)}</DetailRow>
          </>
        ) : null}
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
