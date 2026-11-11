import { useTranslation } from 'react-i18next';

import { AUTO_LOCK_OPTIONS_MS, useAuthPrefsStore } from '@/entities/auth';
import { SettingsChoiceRow } from '@/shared/ui';

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
    <SettingsChoiceRow
      title={t('settings.security.autoLockTitle')}
      description={t('settings.security.autoLockDesc')}
      options={options}
      value={String(autoLockMs)}
      onChange={(value) => {
        const next = AUTO_LOCK_OPTIONS_MS.find((timeoutMs) => String(timeoutMs) === value);
        if (next !== undefined) useAuthPrefsStore.getState().setAutoLockMs(next);
      }}
    />
  );
}
