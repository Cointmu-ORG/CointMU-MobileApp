import { usePreventScreenCapture } from 'expo-screen-capture';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { useMnemonicWords } from '@/entities/wallet';
import { Button, colors, Text, WordGrid } from '@/shared/ui';

type MnemonicBackupProps = {
  onConfirmed: () => void;
};

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
      <WordGrid words={state.words} />
      <Button label={t('onboarding.backup.confirm')} onPress={onConfirmed} />
    </View>
  );
}
