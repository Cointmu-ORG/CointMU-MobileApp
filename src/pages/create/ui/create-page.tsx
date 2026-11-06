import { useTranslation } from 'react-i18next';

import { CreateWalletProgress } from '@/features/create-wallet';
import { Screen, Text } from '@/shared/ui';

export function CreatePage() {
  const { t } = useTranslation();
  return (
    <Screen className="items-center justify-center gap-8">
      <Text variant="title" className="text-center" accessibilityRole="header">
        {t('onboarding.create.title')}
      </Text>
      <CreateWalletProgress />
    </Screen>
  );
}
