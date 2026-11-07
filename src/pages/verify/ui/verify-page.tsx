import { useTranslation } from 'react-i18next';

import { MnemonicQuiz } from '@/features/verify-mnemonic';
import { FormScreen, Text } from '@/shared/ui';

export function VerifyPage() {
  const { t } = useTranslation();
  return (
    <FormScreen>
      <Text variant="title" accessibilityRole="header">
        {t('onboarding.verify.title')}
      </Text>
      <Text tone="secondary">{t('onboarding.verify.subtitle')}</Text>
      <MnemonicQuiz />
    </FormScreen>
  );
}
