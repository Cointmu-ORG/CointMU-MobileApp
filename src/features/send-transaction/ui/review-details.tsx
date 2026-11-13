import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { NATIVE_ASSET } from '@/entities/asset';
import { useActiveRpcUrl } from '@/entities/network';
import { AccountBadge, useAccount, useAccountLabel } from '@/entities/wallet';
import { formatAmount, formatUrlHost } from '@/shared/lib';
import { Card, Text } from '@/shared/ui';

import type { SendDraft } from '../model/send-flow-store';

const FROM_BADGE_SIZE = 28;

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

/** Everything the user is about to sign, in full: the recipient is never shortened here. */
export function ReviewDetails({ draft }: { draft: SendDraft }) {
  const { t, i18n } = useTranslation();
  const account = useAccount(draft.from);
  const labelOf = useAccountLabel();
  const node = useActiveRpcUrl();
  // Exact amounts on the review: every significant digit, nothing truncated.
  const format = (value: bigint, decimals: number) =>
    formatAmount(value, decimals, { locale: i18n.language, maxFractionDigits: decimals });
  const amount = `${format(draft.amount, draft.asset.decimals)} ${draft.asset.symbol}`;
  const fee = `${format(draft.quote.maxFee, NATIVE_ASSET.decimals)} ${NATIVE_ASSET.symbol}`;
  const total =
    draft.asset.kind === 'native'
      ? `${format(draft.amount + draft.quote.maxFee, NATIVE_ASSET.decimals)} ${NATIVE_ASSET.symbol}`
      : `${amount} + ${fee}`;

  return (
    <Card className="gap-0">
      <Row label={t('send.review.from')}>
        <View className="flex-row items-center gap-2">
          {account ? <AccountBadge account={account} size={FROM_BADGE_SIZE} /> : null}
          <Text variant="label" className="flex-1">
            {account ? labelOf(account) : ''}
          </Text>
        </View>
        <Text variant="mono" tone="secondary" selectable>
          {draft.from.address}
        </Text>
      </Row>
      <Row label={t('send.review.to')}>
        <Text variant="mono" selectable>
          {draft.to}
        </Text>
      </Row>
      <Row label={t('send.review.amount')}>
        <Text variant="heading">{amount}</Text>
      </Row>
      <Row label={t('send.review.fee')}>
        <Text>{fee}</Text>
        {draft.asset.kind === 'erc20' ? (
          <Text variant="caption" tone="secondary">
            {t('send.review.tokenFeeNote')}
          </Text>
        ) : null}
      </Row>
      <Row label={t('send.review.total')}>
        <Text variant="label">{total}</Text>
      </Row>
      <Row label={t('send.review.node')}>
        <Text tone="secondary">{formatUrlHost(node)}</Text>
      </Row>
    </Card>
  );
}
