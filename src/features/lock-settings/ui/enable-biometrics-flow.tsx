import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  enableBiometrics,
  getBiometricAvailability,
  PinPrompt,
  type BiometricKind,
  type EnableBiometricsResult,
} from '@/entities/auth';
import { logger } from '@/shared/lib';
import { Button, Notice, Text } from '@/shared/ui';

import { useBiometricLabel } from './biometric-label';

type Step = 'pin' | 'confirming' | Exclude<EnableBiometricsResult, 'enabled'>;

function useBiometricKind(): BiometricKind | null {
  const [kind, setKind] = useState<BiometricKind | null>(null);
  useEffect(() => {
    getBiometricAvailability()
      .then((availability) =>
        setKind(availability.status === 'no-hardware' ? null : availability.kind),
      )
      .catch((error: unknown) => logger.warn('Checking biometrics failed', { error }));
  }, []);
  return kind;
}

/**
 * Turning biometric unlock on: the PIN first (PIN only, it counts toward the lockout), then one
 * successful biometric check. Only then is the setting saved. Cancelling the system prompt
 * leaves it off and offers another try.
 */
export function EnableBiometricsFlow({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const { name } = useBiometricLabel(useBiometricKind());
  const [step, setStep] = useState<Step>('pin');

  const confirm = async () => {
    setStep('confirming');
    try {
      const result = await enableBiometrics(t('settings.biometrics.prompt', { name }));
      if (result === 'enabled') onDone();
      else setStep(result);
    } catch (error) {
      logger.warn('Turning on biometrics failed', { error });
      setStep('not-confirmed');
    }
  };

  if (step === 'pin') {
    return (
      <PinPrompt
        title={t('settings.biometrics.pinTitle')}
        subtitle={t('settings.biometrics.pinSubtitle', { name })}
        onVerified={() => void confirm()}
      />
    );
  }
  return (
    <View className="flex-1 justify-center gap-6">
      <View className="gap-2">
        <Text variant="title" accessibilityRole="header">
          {t('settings.biometrics.confirmTitle', { name })}
        </Text>
        <Text tone="secondary">{t('settings.biometrics.confirmBody', { name })}</Text>
      </View>
      {step === 'unavailable' ? (
        <Notice tone="warning">{t('settings.biometrics.unavailable', { name })}</Notice>
      ) : null}
      {step === 'not-confirmed' ? (
        <Notice tone="warning">{t('settings.biometrics.notConfirmed', { name })}</Notice>
      ) : null}
      <View className="gap-2">
        <Button
          label={t('settings.biometrics.tryAgain')}
          onPress={() => void confirm()}
          isLoading={step === 'confirming'}
          isDisabled={step === 'unavailable'}
        />
        <Button label={t('common.cancel')} variant="ghost" onPress={onDone} />
      </View>
    </View>
  );
}
