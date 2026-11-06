import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from 'react-native';

import { authenticateWithBiometrics, canUseBiometrics, useAuthPrefsStore } from '@/entities/auth';
import { logger } from '@/shared/lib';
import { colors, ListRow } from '@/shared/ui';

/** Turning biometrics on needs one successful biometric check; turning it off does not. */
export function BiometricsSwitch() {
  const { t } = useTranslation();
  const isEnabled = useAuthPrefsStore((state) => state.isBiometricsEnabled);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    canUseBiometrics()
      .then(setIsAvailable)
      .catch((error: unknown) => {
        logger.warn('Checking biometrics failed', { error });
        setIsAvailable(false);
      });
  }, []);

  const toggle = async (next: boolean) => {
    const { setBiometricsEnabled } = useAuthPrefsStore.getState();
    if (!next) return setBiometricsEnabled(false);
    setIsBusy(true);
    try {
      setBiometricsEnabled(
        await authenticateWithBiometrics(t('settings.security.biometricsPrompt')),
      );
    } catch (error) {
      logger.warn('Biometric enrolment failed', { error });
    } finally {
      setIsBusy(false);
    }
  };

  const isUnavailable = isAvailable === false;
  return (
    <ListRow
      title={t('settings.security.biometricsTitle')}
      description={t(
        isUnavailable
          ? 'settings.security.biometricsUnavailable'
          : 'settings.security.biometricsDesc',
      )}
      trailing={
        <Switch
          value={isEnabled && !isUnavailable}
          onValueChange={(next) => void toggle(next)}
          disabled={isAvailable !== true || isBusy}
          accessibilityLabel={t('settings.security.biometricsTitle')}
          trackColor={{ false: colors.content.secondary, true: colors.primary[600] }}
          thumbColor={colors.surface.card}
          ios_backgroundColor={colors.content.secondary}
        />
      }
    />
  );
}
