import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { canUseBiometrics, PIN_LENGTH } from '@/entities/auth';
import { logger } from '@/shared/lib';
import { PinDots, PinPad, Text, usePinInput } from '@/shared/ui';

import { finishOnboarding, savePin } from '../model/save-pin';
import { BiometricsOffer } from './biometrics-offer';

type Step = 'create' | 'confirm' | 'saving' | 'biometrics';

/** Enter the PIN twice, save its hash, then optionally offer biometrics. */
export function SetupPinFlow() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('create');
  const [message, setMessage] = useState<string | null>(null);
  const [errorSignal, setErrorSignal] = useState(0);
  // Kept in a ref only between the two entries; never leaves this component.
  const firstPin = useRef<string | null>(null);

  const fail = useCallback((text: string) => {
    firstPin.current = null;
    setMessage(text);
    setErrorSignal((signal) => signal + 1);
    setStep('create');
  }, []);

  const confirmAndSave = useCallback(
    async (pin: string) => {
      if (pin !== firstPin.current) return fail(t('onboarding.setPin.mismatch'));
      firstPin.current = null;
      setStep('saving');
      try {
        await savePin(pin);
        if (await canUseBiometrics()) return setStep('biometrics');
        finishOnboarding();
      } catch (error) {
        logger.error('Saving PIN failed', { error });
        fail(t('onboarding.setPin.error'));
      }
    },
    [fail, t],
  );

  const handleComplete = useCallback(
    (pin: string) => {
      setMessage(null);
      if (firstPin.current === null) {
        firstPin.current = pin;
        setStep('confirm');
        return;
      }
      void confirmAndSave(pin);
    },
    [confirmAndSave],
  );

  const { filledCount, addDigit, removeDigit, clear } = usePinInput(PIN_LENGTH, handleComplete);
  // Empty the dots whenever the step changes (create → confirm, or back after an error).
  useEffect(clear, [step, clear]);

  if (step === 'biometrics') return <BiometricsOffer onDone={finishOnboarding} />;

  return (
    <View className="flex-1 justify-between gap-8">
      <View className="gap-6 pt-8">
        <View className="gap-2">
          <Text variant="title" accessibilityRole="header">
            {t(
              step === 'create'
                ? 'onboarding.setPin.titleCreate'
                : 'onboarding.setPin.titleConfirm',
            )}
          </Text>
          <Text tone="secondary">{t('onboarding.setPin.subtitle')}</Text>
        </View>
        <PinDots length={PIN_LENGTH} filledCount={filledCount} errorSignal={errorSignal} />
        <Text tone="danger" className="text-center" accessibilityLiveRegion="polite">
          {message ?? ''}
        </Text>
      </View>
      <PinPad onDigit={addDigit} onDelete={removeDigit} isDisabled={step === 'saving'} />
    </View>
  );
}
