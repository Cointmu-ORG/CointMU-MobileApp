import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Input, type InputStatus, useShake } from '@/shared/ui';

type QuizFieldProps = {
  wordNumber: number;
  value: string;
  status: InputStatus;
  /** Increment to shake the field after a wrong answer. */
  errorSignal: number;
  onChangeText: (text: string) => void;
};

// Secret-word input: no autocorrect, suggestions or autofill that could keep a copy.
const SECRET_INPUT_PROPS = {
  autoCapitalize: 'none',
  autoCorrect: false,
  autoComplete: 'off',
  spellCheck: false,
  importantForAutofill: 'no',
} as const;

export function QuizField({
  wordNumber,
  value,
  status,
  errorSignal,
  onChangeText,
}: QuizFieldProps) {
  const { t } = useTranslation();
  const { style, shake } = useShake();
  const lastSignal = useRef(errorSignal);

  useEffect(() => {
    if (errorSignal === lastSignal.current) return;
    lastSignal.current = errorSignal;
    if (status === 'error') shake();
  }, [errorSignal, status, shake]);

  const message =
    status === 'error'
      ? t('onboarding.verify.incorrect')
      : status === 'success'
        ? t('onboarding.verify.correct')
        : undefined;

  return (
    <Input
      label={t('onboarding.verify.wordLabel', { number: wordNumber })}
      value={value}
      onChangeText={onChangeText}
      status={status}
      message={message}
      animatedStyle={style}
      {...SECRET_INPUT_PROPS}
    />
  );
}
