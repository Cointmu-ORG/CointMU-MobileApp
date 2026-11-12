import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { useMnemonicWords, useWalletStore } from '@/entities/wallet';
import { secureRandomInt, type RandomInt } from '@/shared/lib';
import { Button, type InputStatus, MOTION, Text, useThemeColors } from '@/shared/ui';

import { pickQuizIndices } from '../lib/pick-quiz-indices';
import { QuizField } from './quiz-field';

const QUIZ_WORD_COUNT = 3; // D-14

type QuizFormProps = {
  words: readonly string[];
  randomInt: RandomInt;
  walletId: string;
  onPassed?: () => void;
};

function QuizForm({ words, randomInt, walletId, onPassed }: QuizFormProps) {
  const { t } = useTranslation();
  const [indices] = useState(() => pickQuizIndices(words.length, QUIZ_WORD_COUNT, randomInt));
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [statuses, setStatuses] = useState<Record<number, InputStatus>>({});
  const [errorSignal, setErrorSignal] = useState(0);
  const [isPassed, setIsPassed] = useState(false);

  const submit = () => {
    const next = Object.fromEntries(
      indices.map((index) => {
        const isCorrect = (answers[index] ?? '').trim().toLowerCase() === words[index];
        return [index, isCorrect ? 'success' : 'error'];
      }),
    ) as Record<number, InputStatus>;
    setStatuses(next);
    if (indices.some((index) => next[index] === 'error')) {
      setErrorSignal((signal) => signal + 1);
      return;
    }
    setIsPassed(true);
    // Let the "correct" feedback show before the flow moves on (in onboarding, to set-pin).
    setTimeout(() => {
      useWalletStore.getState().completeBackup(walletId);
      onPassed?.();
    }, MOTION.slowMs);
  };

  return (
    <View className="gap-4">
      {indices.map((index) => (
        <QuizField
          key={index}
          wordNumber={index + 1}
          value={answers[index] ?? ''}
          status={statuses[index] ?? 'default'}
          errorSignal={errorSignal}
          onChangeText={(text) => {
            setAnswers((current) => ({ ...current, [index]: text }));
            setStatuses((current) => ({ ...current, [index]: 'default' }));
          }}
        />
      ))}
      <Button label={t('onboarding.verify.submit')} onPress={submit} isLoading={isPassed} />
    </View>
  );
}

type MnemonicQuizProps = {
  /** The wallet whose backup is being verified. */
  walletId: string;
  /** Called once the wallet's backup is marked done. Onboarding needs none. */
  onPassed?: () => void;
  randomInt?: RandomInt;
};

/** Re-enter 3 random words; only a full pass clears the wallet's pending backup (D-14). */
export function MnemonicQuiz({
  walletId,
  onPassed,
  randomInt = secureRandomInt,
}: MnemonicQuizProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const state = useMnemonicWords(walletId);
  if (state.status === 'loading') return <ActivityIndicator color={colors.accent.DEFAULT} />;
  if (state.status === 'error') {
    return <Text tone="danger">{t('onboarding.backup.loadError')}</Text>;
  }
  return (
    <QuizForm words={state.words} randomInt={randomInt} walletId={walletId} onPassed={onPassed} />
  );
}
