import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { authenticateWithBiometrics, useAuthPrefsStore } from '@/entities/auth';
import { logger } from '@/shared/lib';
import { Button, Text } from '@/shared/ui';

/** Optional biometrics on top of the PIN. A successful prompt is required to turn it on. */
export function BiometricsOffer({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [isBusy, setIsBusy] = useState(false);

  const enable = async () => {
    setIsBusy(true);
    try {
      const isConfirmed = await authenticateWithBiometrics(t('lock.biometricsPrompt'));
      useAuthPrefsStore.getState().setBiometricsEnabled(isConfirmed);
    } catch (error) {
      logger.warn('Biometric enrolment prompt failed', { error });
    } finally {
      onDone();
    }
  };

  return (
    <View className="flex-1 justify-center gap-6">
      <View className="gap-2">
        <Text variant="title" accessibilityRole="header">
          {t('onboarding.setPin.biometricsTitle')}
        </Text>
        <Text tone="secondary">{t('onboarding.setPin.biometricsBody')}</Text>
      </View>
      <Button
        label={t('onboarding.setPin.biometricsEnable')}
        onPress={() => void enable()}
        isLoading={isBusy}
      />
      <Button
        label={t('onboarding.setPin.biometricsSkip')}
        variant="ghost"
        onPress={onDone}
        isDisabled={isBusy}
      />
    </View>
  );
}
