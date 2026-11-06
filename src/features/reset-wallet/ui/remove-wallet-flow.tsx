import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, View } from 'react-native';

import { PinPrompt } from '@/entities/auth';
import { logger } from '@/shared/lib';
import { Button, Checkbox, colors, ICON_SIZE, Text } from '@/shared/ui';

import { resetWallet } from '../model/reset-wallet';

function Warning({ onContinue }: { onContinue: () => void }) {
  const { t } = useTranslation();
  const [hasBackup, setHasBackup] = useState(false);
  return (
    <ScrollView contentContainerClassName="gap-6 pb-8">
      <View className="gap-3 rounded-card border border-danger bg-danger-soft p-4">
        <View className="flex-row items-center gap-2">
          <TriangleAlert size={ICON_SIZE.md} color={colors.danger.strong} />
          <Text variant="label" tone="danger" className="flex-1">
            {t('settings.removeWallet.warningTitle')}
          </Text>
        </View>
        <Text variant="body">{t('settings.removeWallet.warning')}</Text>
      </View>
      <Text tone="secondary">{t('settings.removeWallet.description')}</Text>
      <Checkbox
        label={t('settings.removeWallet.ack')}
        isChecked={hasBackup}
        onToggle={() => setHasBackup((current) => !current)}
      />
      <Button
        label={t('settings.removeWallet.continue')}
        variant="danger"
        onPress={onContinue}
        isDisabled={!hasBackup}
      />
    </ScrollView>
  );
}

/**
 * "Remove wallet from this device": warning with a backup acknowledgement (first confirmation),
 * PIN, then a final confirmation before the same wipe as reset-wallet. The router then goes
 * back to onboarding.
 */
export function RemoveWalletFlow({ onCancel }: { onCancel: () => void }) {
  const { t } = useTranslation();
  const [isPinStep, setIsPinStep] = useState(false);

  const confirmRemoval = useCallback(() => {
    Alert.alert(t('settings.removeWallet.finalTitle'), t('reset.finalBody'), [
      { text: t('common.cancel'), style: 'cancel', onPress: onCancel },
      {
        text: t('settings.removeWallet.confirm'),
        style: 'destructive',
        onPress: () => {
          resetWallet().catch((error: unknown) => logger.error('Wallet removal failed', { error }));
        },
      },
    ]);
  }, [onCancel, t]);

  if (!isPinStep) return <Warning onContinue={() => setIsPinStep(true)} />;
  return (
    <PinPrompt
      title={t('settings.removeWallet.authTitle')}
      subtitle={t('settings.removeWallet.authSubtitle')}
      onVerified={confirmRemoval}
    />
  );
}
