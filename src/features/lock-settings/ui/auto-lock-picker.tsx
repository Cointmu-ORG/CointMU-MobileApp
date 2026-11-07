import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AUTO_LOCK_OPTIONS_MS, useAuthPrefsStore } from '@/entities/auth';
import { SegmentedControl, Text } from '@/shared/ui';

const MINUTE_MS = 60_000;

export function AutoLockPicker() {
  const { t } = useTranslation();
  const autoLockMs = useAuthPrefsStore((state) => state.autoLockMs);
  const options = AUTO_LOCK_OPTIONS_MS.map((timeoutMs) => ({
    value: String(timeoutMs),
    label:
      timeoutMs === 0
        ? t('settings.security.immediately')
        : t('settings.security.minutes', { count: timeoutMs / MINUTE_MS }),
  }));

  return (
    <View className="gap-3 px-4 py-3">
      <View className="gap-0.5">
        <Text variant="label">{t('settings.security.autoLockTitle')}</Text>
        <Text variant="caption" tone="secondary">
          {t('settings.security.autoLockDesc')}
        </Text>
      </View>
      <SegmentedControl
        accessibilityLabel={t('settings.security.autoLockTitle')}
        options={options}
        value={String(autoLockMs)}
        onChange={(value) => {
          const next = AUTO_LOCK_OPTIONS_MS.find((timeoutMs) => String(timeoutMs) === value);
          if (next !== undefined) useAuthPrefsStore.getState().setAutoLockMs(next);
        }}
      />
    </View>
  );
}
