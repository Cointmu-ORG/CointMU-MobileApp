import { usePreventScreenCapture } from 'expo-screen-capture';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { useMnemonicWords } from '@/entities/wallet';
import { Button, Text, useThemeColors, WordGrid } from '@/shared/ui';

type MnemonicBackupProps = {
  /** The wallet whose phrase is shown. */
  walletId: string;
  onConfirmed: () => void;
};

/**
 * Shows the recovery phrase with screenshots blocked (D-14).
 * Deliberately no copy button: the clipboard is forbidden for secrets (forbidden rule 2).
 */
export function MnemonicBackup({ walletId, onConfirmed }: MnemonicBackupProps) {
  const colors = useThemeColors();
  usePreventScreenCapture();
  const { t } = useTranslation();
  const state = useMnemonicWords(walletId);

  if (state.status === 'loading') return <ActivityIndicator color={colors.accent.DEFAULT} />;
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
