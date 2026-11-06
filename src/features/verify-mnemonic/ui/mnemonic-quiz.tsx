import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { useMnemonicWords, useWalletStore } from '@/entities/wallet';
import { secureRandomInt, type RandomInt } from '@/shared/lib';
import { Button, colors, type InputStatus, MOTION, Text } from '@/shared/ui';

import { pickQuizIndices } from '../lib/pick-quiz-indices';
import { QuizField } from './quiz-field';

const QUIZ_WORD_COUNT = 3; // D-14

type QuizFormProps = { words: readonly string[]; randomInt: RandomInt };

function QuizForm({ words, randomInt }: QuizFormProps) {
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
    // Let the "correct" feedback show before the router moves on to set-pin.
    setTimeout(() => useWalletStore.getState().completeBackup(), MOTION.slowMs);
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

type MnemonicQuizProps = { randomInt?: RandomInt };

/** Re-enter 3 random words; only a full pass moves the wallet past pendingBackup (D-14). */
export function MnemonicQuiz({ randomInt = secureRandomInt }: MnemonicQuizProps) {
  const { t } = useTranslation();
  const state = useMnemonicWords();
  if (state.status === 'loading') return <ActivityIndicator color={colors.primary[600]} />;
  if (state.status === 'error') {
    return <Text tone="danger">{t('onboarding.backup.loadError')}</Text>;
  }
  return <QuizForm words={state.words} randomInt={randomInt} />;
}
