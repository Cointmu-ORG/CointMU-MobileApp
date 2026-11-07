import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { PinPrompt, shouldOfferReset, useSessionStore } from '@/entities/auth';
import { Button, Text } from '@/shared/ui';

import { useUnlockSuccess } from './use-unlock-success';

type UnlockFormProps = {
  /** Shown after too many failures (D-16); the page owns the reset confirmation. */
  onResetRequested: () => void;
};

function completeUnlock(): void {
  useSessionStore.getState().unlock();
}

export function UnlockForm({ onResetRequested }: UnlockFormProps) {
  const { t } = useTranslation();
  const { style: successStyle, play: playSuccess } = useUnlockSuccess();
  const handleVerified = useCallback(() => playSuccess(completeUnlock), [playSuccess]);

  return (
    <Animated.View style={[styles.fill, successStyle]}>
      <PinPrompt
        title={t('lock.title')}
        onVerified={handleVerified}
        biometrics={{ prompt: t('lock.biometricsPrompt'), shouldPromptOnMount: true }}
        renderFooter={(lockout) =>
          lockout !== null && shouldOfferReset(lockout) ? (
            <View className="gap-2">
              <Text variant="caption" tone="secondary" className="text-center">
                {t('lock.resetHint')}
              </Text>
              <Button label={t('lock.resetButton')} variant="ghost" onPress={onResetRequested} />
            </View>
          ) : null
        }
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
