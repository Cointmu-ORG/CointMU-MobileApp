import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Text } from '@/shared/ui';

import { formatCountdown } from '../lib/format-countdown';

type LockoutNoticeProps = {
  remainingMs: number;
  message: string | null;
  isResetOffered: boolean;
  onResetRequested: () => void;
};

export function LockoutNotice({
  remainingMs,
  message,
  isResetOffered,
  onResetRequested,
}: LockoutNoticeProps) {
  const { t } = useTranslation();
  const text =
    remainingMs > 0 ? t('lock.lockedOut', { time: formatCountdown(remainingMs) }) : message;

  return (
    <View className="min-h-12 gap-3">
      <Text tone="danger" className="text-center" accessibilityLiveRegion="polite">
        {text ?? ''}
      </Text>
      {isResetOffered ? (
        <View className="gap-2">
          <Text variant="caption" tone="secondary" className="text-center">
            {t('lock.resetHint')}
          </Text>
          <Button label={t('lock.resetButton')} variant="ghost" onPress={onResetRequested} />
        </View>
      ) : null}
    </View>
  );
}
