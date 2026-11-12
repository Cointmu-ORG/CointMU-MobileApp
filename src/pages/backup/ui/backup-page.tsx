import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { useWalletStore } from '@/entities/wallet';
import { MnemonicBackup } from '@/features/backup-mnemonic';
import { ROUTES } from '@/shared/config';
import { Screen, Text } from '@/shared/ui';

export function BackupPage() {
  const { t } = useTranslation();
  // Onboarding has one wallet, and it is the one waiting for its backup.
  const walletId = useWalletStore(
    (state) => state.wallets.find((wallet) => wallet.isBackupPending)?.id,
  );
  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-6 pb-8">
        <Text variant="title" accessibilityRole="header">
          {t('onboarding.backup.title')}
        </Text>
        <Text tone="secondary">{t('onboarding.backup.subtitle')}</Text>
        {walletId ? (
          <MnemonicBackup walletId={walletId} onConfirmed={() => router.push(ROUTES.verify)} />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
