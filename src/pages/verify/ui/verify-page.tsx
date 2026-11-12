import { useTranslation } from 'react-i18next';

import { useWalletStore } from '@/entities/wallet';
import { MnemonicQuiz } from '@/features/verify-mnemonic';
import { FormScreen, Text } from '@/shared/ui';

export function VerifyPage() {
  const { t } = useTranslation();
  const walletId = useWalletStore(
    (state) => state.wallets.find((wallet) => wallet.isBackupPending)?.id,
  );
  return (
    <FormScreen>
      <Text variant="title" accessibilityRole="header">
        {t('onboarding.verify.title')}
      </Text>
      <Text tone="secondary">{t('onboarding.verify.subtitle')}</Text>
      {walletId ? <MnemonicQuiz walletId={walletId} /> : null}
    </FormScreen>
  );
}
