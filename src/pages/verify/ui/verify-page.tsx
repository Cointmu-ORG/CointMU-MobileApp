import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { MnemonicQuiz } from '@/features/verify-mnemonic';
import { Screen, Text } from '@/shared/ui';

export function VerifyPage() {
  const { t } = useTranslation();
  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-6 pb-8" keyboardShouldPersistTaps="handled">
        <Text variant="title" accessibilityRole="header">
          {t('onboarding.verify.title')}
        </Text>
        <Text tone="secondary">{t('onboarding.verify.subtitle')}</Text>
        <MnemonicQuiz />
      </ScrollView>
    </Screen>
  );
}
