import Ban from 'lucide-react-native/icons/ban';
import Check from 'lucide-react-native/icons/check';
import CheckCheck from 'lucide-react-native/icons/check-check';
import CircleX from 'lucide-react-native/icons/circle-x';
import Hourglass from 'lucide-react-native/icons/hourglass';
import Repeat from 'lucide-react-native/icons/repeat';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { colors, ICON_SIZE, Text, type TextTone } from '@/shared/ui';

import { TX_POLICY } from '../config/tx-config';
import type { TxStatus } from '../model/types';

const STYLE: Record<TxStatus, { Icon: LucideIcon; tone: TextTone; color: string; box: string }> = {
  pending: {
    Icon: Hourglass,
    tone: 'warning',
    color: colors.warning.strong,
    box: 'bg-warning-soft',
  },
  confirmed: { Icon: Check, tone: 'primary', color: colors.primary[600], box: 'bg-primary-50' },
  final: {
    Icon: CheckCheck,
    tone: 'success',
    color: colors.success.strong,
    box: 'bg-success-soft',
  },
  failed: { Icon: CircleX, tone: 'danger', color: colors.danger.strong, box: 'bg-danger-soft' },
  dropped: {
    Icon: Ban,
    tone: 'secondary',
    color: colors.content.secondary,
    box: 'bg-surface-muted',
  },
  replaced: {
    Icon: Repeat,
    tone: 'secondary',
    color: colors.content.secondary,
    box: 'bg-surface-muted',
  },
};

type TxStatusBadgeProps = {
  status: TxStatus;
  /** Shown as "n/12" while confirming, so "confirmed" is never mistaken for final. */
  confirmations?: number;
};

/** Status chip: icon and text, never color alone. */
export function TxStatusBadge({ status, confirmations = 0 }: TxStatusBadgeProps) {
  const { t } = useTranslation();
  const { Icon, tone, color, box } = STYLE[status];
  const label =
    status === 'confirmed'
      ? t('tx.status.confirmedCount', { count: confirmations, total: TX_POLICY.finalConfirmations })
      : t(`tx.status.${status}`);
  return (
    <View
      className={`flex-row items-center gap-1 self-start rounded-full px-2 py-1 ${box}`}
      accessibilityLabel={label}
    >
      <Icon size={ICON_SIZE.sm} color={color} accessibilityElementsHidden />
      <Text variant="caption" tone={tone}>
        {label}
      </Text>
    </View>
  );
}
