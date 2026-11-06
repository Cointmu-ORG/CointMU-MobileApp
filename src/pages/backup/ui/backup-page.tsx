import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { MnemonicBackup } from '@/features/backup-mnemonic';
import { ROUTES } from '@/shared/config';
import { Screen, Text } from '@/shared/ui';

export function BackupPage() {
  const { t } = useTranslation();
  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-6 pb-8">
        <Text variant="title" accessibilityRole="header">
          {t('onboarding.backup.title')}
        </Text>
        <Text tone="secondary">{t('onboarding.backup.subtitle')}</Text>
        <MnemonicBackup onConfirmed={() => router.push(ROUTES.verify)} />
      </ScrollView>
    </Screen>
  );
}
