import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { logger } from '@/shared/lib';
import { PinDots, PinPad, Spinner, Text, usePinInput } from '@/shared/ui';

import { PIN_LENGTH } from '../config/auth-config';

type Step = 'create' | 'confirm' | 'saving';

type NewPinFormProps = {
  createTitle: string;
  confirmTitle: string;
  subtitle: string;
  /** Shown when onConfirmed throws; the form starts over. */
  errorMessage: string;
  /** Runs once with the confirmed PIN while a UI-thread spinner shows (hashing blocks JS). */
  onConfirmed: (pin: string) => Promise<void>;
};

/**
 * Enter a new PIN twice. Nothing is hashed until the confirmation matches; the PIN is kept in a
 * ref only between the two entries and never leaves this component except via onConfirmed.
 */
export function NewPinForm(props: NewPinFormProps) {
  const { createTitle, confirmTitle, subtitle, errorMessage, onConfirmed } = props;
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('create');
  const [message, setMessage] = useState<string | null>(null);
  const [errorSignal, setErrorSignal] = useState(0);
  const firstPin = useRef<string | null>(null);

  const fail = useCallback((text: string) => {
    firstPin.current = null;
    setMessage(text);
    setErrorSignal((signal) => signal + 1);
    setStep('create');
  }, []);

  const confirm = useCallback(
    async (pin: string) => {
      if (pin !== firstPin.current) return fail(t('pinPrompt.mismatch'));
      firstPin.current = null;
      setStep('saving');
      try {
        await onConfirmed(pin);
      } catch (error) {
        logger.error('Saving a new PIN failed', { error });
        fail(errorMessage);
      }
    },
    [errorMessage, fail, onConfirmed, t],
  );

  const handleComplete = useCallback(
    (pin: string) => {
      setMessage(null);
      if (firstPin.current !== null) return void confirm(pin);
      firstPin.current = pin;
      setStep('confirm');
    },
    [confirm],
  );

  const { filledCount, addDigit, removeDigit, clear } = usePinInput(PIN_LENGTH, handleComplete);
  // Empty the dots whenever the step changes (create → confirm, or back after an error).
  useEffect(clear, [step, clear]);

  const isSaving = step === 'saving';
  return (
    <View className="flex-1 justify-between gap-8">
      <View className="gap-6 pt-8">
        <View className="gap-2">
          <Text variant="title" accessibilityRole="header">
            {step === 'create' ? createTitle : confirmTitle}
          </Text>
          <Text tone="secondary">{subtitle}</Text>
        </View>
        <PinDots
          length={PIN_LENGTH}
          filledCount={isSaving ? PIN_LENGTH : filledCount}
          errorSignal={errorSignal}
        />
        <View className="min-h-12 items-center gap-3">
          {isSaving ? <Spinner size="small" /> : null}
          <Text
            tone={isSaving ? 'secondary' : 'danger'}
            className="text-center"
            accessibilityLiveRegion="polite"
          >
            {isSaving ? t('pinPrompt.saving') : (message ?? '')}
          </Text>
        </View>
      </View>
      <PinPad onDigit={addDigit} onDelete={removeDigit} isDisabled={isSaving} />
    </View>
  );
}
