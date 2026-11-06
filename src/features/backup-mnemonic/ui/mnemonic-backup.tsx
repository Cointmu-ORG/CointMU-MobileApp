import { usePreventScreenCapture } from 'expo-screen-capture';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useMnemonicWords } from '@/entities/wallet';
import { Button, colors, MOTION, Text } from '@/shared/ui';

type MnemonicBackupProps = {
  onConfirmed: () => void;
};

function WordChip({ index, word }: { index: number; word: string }) {
  return (
    <View className="w-1/2 p-1">
      <Animated.View entering={FadeIn.delay(index * MOTION.staggerMs).duration(MOTION.baseMs)}>
        <View className="flex-row items-center gap-2 rounded-control border border-border bg-surface-card px-3 py-3">
          <Text variant="caption" tone="muted">
            {index + 1}
          </Text>
          <Text variant="body">{word}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

/**
 * Shows the recovery phrase with screenshots blocked (D-14).
 * Deliberately no copy button: the clipboard is forbidden for secrets (forbidden rule 2).
 */
export function MnemonicBackup({ onConfirmed }: MnemonicBackupProps) {
  usePreventScreenCapture();
  const { t } = useTranslation();
  const state = useMnemonicWords();

  if (state.status === 'loading') return <ActivityIndicator color={colors.primary[600]} />;
  if (state.status === 'error') {
    return (
      <Text tone="danger" accessibilityLiveRegion="polite">
        {t('onboarding.backup.loadError')}
      </Text>
    );
  }

  return (
    <View className="gap-6">
      <View className="flex-row flex-wrap">
        {state.words.map((word, index) => (
          <WordChip key={`${index}-${word}`} index={index} word={word} />
        ))}
      </View>
      <Button label={t('onboarding.backup.confirm')} onPress={onConfirmed} />
    </View>
  );
}
