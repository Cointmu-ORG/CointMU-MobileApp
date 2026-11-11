import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LOCKOUT_POLICY, readLockoutState } from '@/entities/auth';
import { logger } from '@/shared/lib';
import { SettingsRow } from '@/shared/ui';

/**
 * How many wrong PINs are on the counter and what happens next. The count is shared by every
 * PIN check (unlock, change PIN, reveal, remove wallet) and a right PIN clears it.
 */
export function LockoutInfo() {
  const { t } = useTranslation();
  const [failedCount, setFailedCount] = useState<number | null>(null);

  useEffect(() => {
    readLockoutState()
      .then((state) => setFailedCount(state.failedCount))
      .catch((error: unknown) => logger.warn('Reading the lockout state failed', { error }));
  }, []);

  return (
    <SettingsRow
      icon={ShieldAlert}
      title={t('settings.security.attemptsTitle')}
      description={t('settings.security.attemptsDesc', {
        free: LOCKOUT_POLICY.freeAttempts,
        limit: LOCKOUT_POLICY.resetOfferAfterFailures,
      })}
      value={
        failedCount === null
          ? undefined
          : t('settings.security.attemptsValue', {
              failed: failedCount,
              limit: LOCKOUT_POLICY.resetOfferAfterFailures,
            })
      }
    />
  );
}
