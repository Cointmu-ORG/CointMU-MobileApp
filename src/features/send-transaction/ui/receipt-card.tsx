import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { NATIVE_ASSET } from '@/entities/asset';
import { TxStatusBadge, type LocalTxRecord } from '@/entities/transaction';
import { AddressLabel } from '@/entities/wallet';
import { formatAmount, formatDateTime } from '@/shared/lib';
import { useAppearanceStore } from '@/shared/model';
import { DetailRow, Text, useThemeColors } from '@/shared/ui';

import { isProblemPhase, phaseTxStatus, stepStates, type SendPhase } from '../lib/send-phase';
import type { SendDraft } from '../model/send-flow-store';
import { StatusSteps } from './status-steps';
import { usePaidFee } from './use-paid-fee';

const NOTCH_SIZE = 20;
const BORDER_WIDTH = 1;
/** Each notch shows only the half inside the card: a clip over the card's border hides the rest. */
const NOTCH_CLIP_WIDTH = NOTCH_SIZE / 2 + BORDER_WIDTH;

/** Phases whose fee is unknown or was never paid by this transfer. */
const PHASES_WITHOUT_FEE: readonly SendPhase[] = ['notSent', 'dropped', 'replaced'];

/** A ticket's tear line: a notch on each edge, cut in the screen color, and a dashed rule. */
function Perforation() {
  const colors = useThemeColors();
  const notch = [
    styles.notch,
    { backgroundColor: colors.surface.DEFAULT, borderColor: colors.border.DEFAULT },
  ];
  return (
    <View
      style={styles.perforation}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.clip, styles.clipLeft]}>
        <View style={[notch, styles.notchLeft]} />
      </View>
      <View style={[styles.dash, { borderColor: colors.border.DEFAULT }]} />
      <View style={[styles.clip, styles.clipRight]}>
        <View style={[notch, styles.notchRight]} />
      </View>
    </View>
  );
}

/** Exact fee: what was paid once mined, else the most it can cost. */
function FeeText({ draft, record }: { draft: SendDraft; record: LocalTxRecord | null }) {
  const { t, i18n } = useTranslation();
  const paid = usePaidFee(record?.hash ?? null, record?.blockNumber != null);
  const exact = (value: bigint) =>
    `${formatAmount(value, NATIVE_ASSET.decimals, {
      locale: i18n.language,
      maxFractionDigits: NATIVE_ASSET.decimals,
    })} ${NATIVE_ASSET.symbol}`;
  return (
    <Text className="text-right">
      {paid === null ? t('tx.details.feeMax', { amount: exact(draft.quote.maxFee) }) : exact(paid)}
    </Text>
  );
}

type ReceiptCardProps = {
  draft: SendDraft;
  phase: SendPhase;
  record: LocalTxRecord | null;
};

/**
 * The receipt: progress on top, then a tear line, then who, how much it cost, when and the
 * status. Every value is one a non-technical reader recognises; the rest is in Technical details.
 */
export function ReceiptCard({ draft, phase, record }: ReceiptCardProps) {
  const { t, i18n } = useTranslation();
  const timeFormat = useAppearanceStore((state) => state.timeFormat);
  const status = phaseTxStatus(phase);
  const rows: ReactNode[] = [
    <DetailRow key="from" label={t('tx.details.from')}>
      <AddressLabel address={draft.from.address} label={t('tx.details.from')} />
    </DetailRow>,
    <DetailRow key="to" label={t('tx.details.to')}>
      <AddressLabel address={draft.to} label={t('tx.details.to')} />
    </DetailRow>,
  ];
  if (!PHASES_WITHOUT_FEE.includes(phase)) {
    rows.push(
      <DetailRow key="fee" label={t('tx.details.fee')}>
        <FeeText draft={draft} record={record} />
      </DetailRow>,
    );
  }
  if (record) {
    rows.push(
      <DetailRow key="date" label={t('tx.details.date')}>
        {formatDateTime(record.createdAt, i18n.language, timeFormat)}
      </DetailRow>,
    );
  }
  if (status) {
    rows.push(
      <DetailRow key="status" label={t('tx.details.status')}>
        <TxStatusBadge status={status} />
      </DetailRow>,
    );
  }

  return (
    <View testID="receipt-card" className="rounded-card border border-border bg-surface-card">
      {isProblemPhase(phase) ? null : (
        <>
          <View className="px-4 pb-4 pt-5">
            <StatusSteps states={stepStates(phase)} />
          </View>
          <Perforation />
        </>
      )}
      <View className="px-4 py-3">{rows}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  perforation: { flexDirection: 'row', alignItems: 'center', height: NOTCH_SIZE },
  clip: {
    position: 'absolute',
    top: 0,
    width: NOTCH_CLIP_WIDTH,
    height: NOTCH_SIZE,
    overflow: 'hidden',
  },
  clipLeft: { left: -BORDER_WIDTH },
  clipRight: { right: -BORDER_WIDTH },
  notch: {
    position: 'absolute',
    top: 0,
    width: NOTCH_SIZE,
    height: NOTCH_SIZE,
    borderRadius: NOTCH_SIZE / 2,
    borderWidth: BORDER_WIDTH,
  },
  notchLeft: { left: -NOTCH_SIZE / 2 },
  notchRight: { left: 0 },
  dash: {
    flex: 1,
    marginHorizontal: NOTCH_SIZE,
    borderTopWidth: BORDER_WIDTH,
    borderStyle: 'dashed',
  },
});
