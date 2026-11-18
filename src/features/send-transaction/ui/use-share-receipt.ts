import { useTranslation } from 'react-i18next';
import { Share } from 'react-native';

import type { LocalTxRecord } from '@/entities/transaction';
import { useAccountByAddress, useAccountLabel } from '@/entities/wallet';
import { formatDateTime, logger, shortenAddress } from '@/shared/lib';
import { useAmountDisplay, useAppearanceStore } from '@/shared/model';

import { buildReceiptText } from '../lib/receipt-text';
import { phaseTxStatus, type SendPhase } from '../lib/send-phase';
import type { SendDraft } from '../model/send-flow-store';

type ShareInput = {
  draft: SendDraft;
  phase: SendPhase;
  hash: string;
  record: LocalTxRecord | null;
};

/** Opens the system share sheet with the receipt as plain text: the values the receipt shows. */
export function useShareReceipt({ draft, phase, hash, record }: ShareInput): () => Promise<void> {
  const { t, i18n } = useTranslation();
  const { formatPlain } = useAmountDisplay();
  const timeFormat = useAppearanceStore((state) => state.timeFormat);
  const recipient = useAccountByAddress(draft.to);
  const labelOf = useAccountLabel();

  return async () => {
    const short = shortenAddress(draft.to);
    const status = phaseTxStatus(phase);
    const message = buildReceiptText(
      {
        amount: `${formatPlain(draft.amount, draft.asset.decimals)} ${draft.asset.symbol}`,
        to: recipient ? `${labelOf(recipient)} (${short})` : short,
        date: formatDateTime(record?.createdAt ?? Date.now(), i18n.language, timeFormat),
        status: status === null ? '' : t(`tx.status.${status}`),
        hash,
      },
      t('send.receipt.shareTitle'),
      t,
    );
    try {
      await Share.share({ message });
    } catch (error) {
      logger.warn('Sharing the receipt failed', { error });
    }
  };
}
