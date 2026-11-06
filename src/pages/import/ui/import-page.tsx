import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { ImportWalletForm } from '@/features/import-wallet';
import { Screen, Text } from '@/shared/ui';

export function ImportPage() {
  const { t } = useTranslation();
  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-6 pb-8" keyboardShouldPersistTaps="handled">
        <Text variant="title" accessibilityRole="header">
          {t('onboarding.import.title')}
        </Text>
        <ImportWalletForm />
      </ScrollView>
    </Screen>
  );
}
