import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useAmountDisplay } from '@/shared/model';
import { Text } from '@/shared/ui';

import type { SendDraft } from '../model/send-flow-store';

/** The amount of the transfer, large and centered, with the decimals chosen in Settings. */
export function ReceiptAmount({ draft }: { draft: SendDraft }) {
  const { t } = useTranslation();
  const { formatPlain } = useAmountDisplay();
  const amount = formatPlain(draft.amount, draft.asset.decimals);
  return (
    <View
      className="flex-row flex-wrap items-baseline justify-center gap-2"
      accessible
      accessibilityLabel={t('send.receipt.amountLabel', {
        amount: `${amount} ${draft.asset.symbol}`,
      })}
    >
      <Text variant="amount" testID="receipt-amount">
        {amount}
      </Text>
      <Text variant="heading" tone="secondary">
        {draft.asset.symbol}
      </Text>
    </View>
  );
}
