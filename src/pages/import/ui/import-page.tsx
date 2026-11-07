import { useTranslation } from 'react-i18next';

import { ImportWalletForm } from '@/features/import-wallet';
import { FormScreen, Text } from '@/shared/ui';

export function ImportPage() {
  const { t } = useTranslation();
  return (
    <FormScreen>
      <Text variant="title" accessibilityRole="header">
        {t('onboarding.import.title')}
      </Text>
      <ImportWalletForm />
    </FormScreen>
  );
}
