import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { logger } from '@/shared/lib';
import { PinEntry, usePinInput } from '@/shared/ui';

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

  return (
    <PinEntry
      title={step === 'create' ? createTitle : confirmTitle}
      subtitle={subtitle}
      length={PIN_LENGTH}
      filledCount={filledCount}
      errorSignal={errorSignal}
      error={message}
      busyLabel={step === 'saving' ? t('pinPrompt.saving') : null}
      onDigit={addDigit}
      onDelete={removeDigit}
    />
  );
}
